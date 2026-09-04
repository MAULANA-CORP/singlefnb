// Business logic untuk modul B2B — dipisah dari route handler supaya route
// tetap tipis (validasi request + panggil fungsi di sini + serialize response).
//
// Alur (lihat PRD §3.3 & §4, dan diagram sequence §5):
//   1. buatOrderB2B      : DRAFT — validasi & kurangi stok Produk Jadi saat itu juga.
//   2. terbitkanInvoice  : DRAFT -> (invoice terbit), nomor invoice via buatNomorDokumen("INV").
//   3. kirimOrder        : catat Surat Jalan + No. Resi.
//   4. bayarOrder        : catat pembayaran (bisa dicicil), buat/update Piutang.
//   5. batalOrder        : hanya sebelum dikirim — kembalikan stok.
//
// `status` (StatusOrderB2B) SELALU dihitung ulang oleh hitungStatusOrder() dari
// kombinasi (ada invoice, ada surat jalan, statusBayar) — bukan ditulis manual di
// tiap langkah — supaya tidak ada state yang saling menimpa/hilang. Misalnya kalau
// Agen bayar lunas sebelum barang dikirim, status langsung "LUNAS" (bukan mundur
// ke "DIKIRIM" saat surat jalan dibuat belakangan).

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { catatAudit, type AuthUser } from "@/lib/api-helpers";
import { buatNomorDokumen } from "@/lib/utils";
import { getLatestHppPerUnitMap } from "@/lib/finance";

export class B2BError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "B2BError";
    this.status = status;
  }
}

type StatusBayar = "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
type StatusOrderB2B = "DRAFT" | "INVOICE" | "DIKIRIM" | "PARSIAL" | "LUNAS" | "SELESAI" | "BATAL";

/** Status headline order = turunan dari invoice/surat-jalan/status-bayar, bukan ditulis manual. */
export function hitungStatusOrder(params: {
  batal?: boolean;
  adaInvoice: boolean;
  adaSuratJalan: boolean;
  statusBayar: StatusBayar;
}): StatusOrderB2B {
  if (params.batal) return "BATAL";
  if (params.statusBayar === "LUNAS" && params.adaSuratJalan) return "SELESAI";
  if (params.statusBayar === "LUNAS") return "LUNAS";
  if (params.statusBayar === "PARSIAL") return "PARSIAL";
  if (params.adaSuratJalan) return "DIKIRIM";
  if (params.adaInvoice) return "INVOICE";
  return "DRAFT";
}

// ---------------------------------------------------------------------------
// BUAT ORDER
// ---------------------------------------------------------------------------

export interface BuatOrderItemInput {
  produkJadiId: string;
  qty: number;
  hargaSatuan?: number; // default: harga ProdukJadi saat ini
}

export interface BuatOrderInput {
  agenId?: string | null;
  agenBaru?: { nama: string; kontak?: string; alamat?: string } | null;
  outletId: string;
  items: BuatOrderItemInput[];
  catatan?: string;
}

export async function buatOrderB2B(user: AuthUser, input: BuatOrderInput) {
  const prisma = getPrisma();

  if (!input.items?.length) {
    throw new B2BError("Order minimal harus punya 1 item produk");
  }
  if (!input.outletId) {
    throw new B2BError("Outlet wajib dipilih");
  }
  if (!input.agenId && !input.agenBaru?.nama?.trim()) {
    throw new B2BError("Agen wajib dipilih atau diisi (agen baru)");
  }

  // Gabungkan qty untuk produk yang sama supaya validasi stok tidak salah hitung
  const qtyPerProduk = new Map<string, number>();
  for (const it of input.items) {
    if (!it.produkJadiId) throw new B2BError("Item order tidak valid");
    if (!(it.qty > 0)) throw new B2BError("Qty item harus lebih dari 0");
    qtyPerProduk.set(it.produkJadiId, (qtyPerProduk.get(it.produkJadiId) ?? 0) + it.qty);
  }

  // Ambil snapshot HPP saat ini
  const hppMap = await getLatestHppPerUnitMap();

  const order = await prisma.$transaction(async (tx) => {
    // 1) Agen — pakai yang dipilih, atau cari/buat baru (dedup by nama, case-insensitive)
    let agenId = input.agenId ?? null;
    if (!agenId && input.agenBaru) {
      const namaBaru = input.agenBaru.nama.trim();
      const existing = await tx.agen.findFirst({
        where: { nama: { equals: namaBaru, mode: "insensitive" } },
      });
      agenId = existing
        ? existing.id
        : (
            await tx.agen.create({
              data: {
                nama: namaBaru,
                kontak: input.agenBaru.kontak?.trim() || null,
                alamat: input.agenBaru.alamat?.trim() || null,
              },
            })
          ).id;
    }
    if (!agenId) throw new B2BError("Agen wajib dipilih atau diisi (agen baru)");

    const agen = await tx.agen.findUnique({ where: { id: agenId } });
    if (!agen) throw new B2BError("Agen tidak ditemukan", 404);

    const outlet = await tx.outlet.findUnique({ where: { id: input.outletId } });
    if (!outlet) throw new B2BError("Outlet tidak ditemukan", 404);

    // 2) Validasi stok — BLOCK kalau ada produk yang stoknya kurang, tanpa override.
    const produkIds = [...qtyPerProduk.keys()];
    const produkList = await tx.produkJadi.findMany({ where: { id: { in: produkIds } } });
    const produkMap = new Map(produkList.map((p) => [p.id, p]));

    const kurang: string[] = [];
    for (const [produkJadiId, qty] of qtyPerProduk) {
      const produk = produkMap.get(produkJadiId);
      if (!produk) {
        kurang.push(`Produk ${produkJadiId} tidak ditemukan`);
        continue;
      }
      if (Number(produk.stok) < qty) {
        kurang.push(`${produk.nama} (stok ${Number(produk.stok)}, diminta ${qty})`);
      }
    }
    if (kurang.length) {
      throw new B2BError(`Stok tidak mencukupi: ${kurang.join("; ")}`, 409);
    }

    // 3) Hitung harga & subtotal per item (input asli, bukan yang sudah digabung)
    const itemsData = input.items.map((it) => {
      const produk = produkMap.get(it.produkJadiId)!;
      const hargaSatuan = it.hargaSatuan ?? Number(produk.harga);
      const subtotal = hargaSatuan * it.qty;
      return { produkJadiId: it.produkJadiId, qty: it.qty, hargaSatuan, subtotal };
    });
    const subtotalOrder = itemsData.reduce((s, it) => s + it.subtotal, 0);

    // 4) Insert order + items
    const created = await tx.orderB2B.create({
      data: {
        nomor: buatNomorDokumen("ORDB2B"),
        agenId,
        outletId: input.outletId,
        userId: user.id,
        status: "DRAFT",
        subtotal: subtotalOrder,
        total: subtotalOrder,
        catatan: input.catatan?.trim() || null,
        items: {
          create: input.items.map((it) => ({
            produkJadiId: it.produkJadiId,
            qty: it.qty,
            hargaSatuan: it.hargaSatuan ?? Number(produkMap.get(it.produkJadiId)!.harga),
            subtotal: (it.hargaSatuan ?? Number(produkMap.get(it.produkJadiId)!.harga)) * it.qty,
            hppSatuanSaatItu: hppMap.get(it.produkJadiId)?.hppPerUnit ?? 0,
          })),
        },
      },
      include: { items: true, agen: true, outlet: true, invoice: true, suratJalan: true, piutang: true },
    });

    // 5) Kurangi stok + catat pergerakan stok (di saat order dibuat, bukan saat kirim)
    for (const [produkJadiId, qty] of qtyPerProduk) {
      const res = await tx.produkJadi.updateMany({
        where: { id: produkJadiId, stok: { gte: qty } },
        data: { stok: { decrement: qty } },
      });
      if (res.count === 0) {
        throw new B2BError(`Stok tidak mencukupi untuk diproses, kemungkinan ada transaksi bersamaan.`);
      }
      await tx.stokMovementProdukJadi.create({
        data: {
          produkJadiId,
          tipe: "OUT",
          qty,
          sumber: "PENJUALAN_B2B",
          referensiId: created.id,
          keterangan: `Order B2B ${created.nomor}`,
        },
      });
    }

    return created;
  });

  await catatAudit({
    userId: user.id,
    aksi: "BUAT_ORDER_B2B",
    entitas: "OrderB2B",
    entitasId: order.id,
    detail: { nomor: order.nomor, total: Number(order.total) },
  });

  return order;
}

// ---------------------------------------------------------------------------
// TERBITKAN INVOICE
// ---------------------------------------------------------------------------

export async function terbitkanInvoice(user: AuthUser, orderId: string) {
  const prisma = getPrisma();

  const order = await prisma.orderB2B.findUnique({
    where: { id: orderId },
    include: { invoice: true },
  });
  if (!order) throw new B2BError("Order tidak ditemukan", 404);
  if (order.status === "BATAL") throw new B2BError("Order sudah dibatalkan");
  if (order.invoice) throw new B2BError("Invoice sudah pernah diterbitkan untuk order ini");
  if (order.status !== "DRAFT") throw new B2BError("Order harus berstatus Draft untuk menerbitkan invoice");

  const nomorInvoice = buatNomorDokumen("INV");
  const statusBaru = hitungStatusOrder({
    adaInvoice: true,
    adaSuratJalan: false,
    statusBayar: order.statusBayar,
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoice.create({ data: { orderB2BId: order.id, nomorInvoice } });
    return tx.orderB2B.update({
      where: { id: order.id },
      data: { status: statusBaru },
      include: { items: true, agen: true, outlet: true, invoice: true, suratJalan: true, piutang: true },
    });
  });

  await catatAudit({
    userId: user.id,
    aksi: "TERBITKAN_INVOICE_B2B",
    entitas: "OrderB2B",
    entitasId: order.id,
    detail: { nomorInvoice },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// KIRIM (SURAT JALAN + NO RESI)
// ---------------------------------------------------------------------------

export async function kirimOrder(user: AuthUser, orderId: string, noResi: string) {
  const prisma = getPrisma();

  if (!noResi?.trim()) throw new B2BError("No. Resi wajib diisi");

  const order = await prisma.orderB2B.findUnique({
    where: { id: orderId },
    include: { invoice: true, suratJalan: true },
  });
  if (!order) throw new B2BError("Order tidak ditemukan", 404);
  if (order.status === "BATAL") throw new B2BError("Order sudah dibatalkan");
  if (!order.invoice) throw new B2BError("Invoice belum diterbitkan — terbitkan invoice terlebih dahulu");
  if (order.suratJalan) throw new B2BError(`Order sudah dikirim sebelumnya (No. Resi: ${order.suratJalan.noResi})`);

  const statusBaru = hitungStatusOrder({
    adaInvoice: true,
    adaSuratJalan: true,
    statusBayar: order.statusBayar,
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.suratJalan.create({
      data: { orderB2BId: order.id, noResi: noResi.trim() },
    });
    return tx.orderB2B.update({
      where: { id: order.id },
      data: { status: statusBaru },
      include: { items: true, agen: true, outlet: true, invoice: true, suratJalan: true, piutang: true },
    });
  });

  await catatAudit({
    userId: user.id,
    aksi: "KIRIM_ORDER_B2B",
    entitas: "OrderB2B",
    entitasId: order.id,
    detail: { noResi: noResi.trim() },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// BAYAR
// ---------------------------------------------------------------------------

export interface BayarOrderInput {
  jumlah: number;
  metodeBayar?: "CASH" | "TRANSFER_QRIS" | "KREDIT";
  tanggalJatuhTempo?: string; // wajib kalau pembayaran ini tidak melunasi seluruh tagihan & belum ada Piutang
  catatan?: string;
}

export async function bayarOrder(user: AuthUser, orderId: string, input: BayarOrderInput) {
  const prisma = getPrisma();

  if (!(input.jumlah > 0)) throw new B2BError("Jumlah bayar harus lebih dari 0");

  const order = await prisma.orderB2B.findUnique({
    where: { id: orderId },
    include: { invoice: true, suratJalan: true, piutang: true, agen: true },
  });
  if (!order) throw new B2BError("Order tidak ditemukan", 404);
  if (order.status === "BATAL") throw new B2BError("Order sudah dibatalkan");
  if (!order.invoice) throw new B2BError("Invoice belum diterbitkan — belum bisa mencatat pembayaran");
  if (order.statusBayar === "LUNAS") throw new B2BError("Order ini sudah lunas");

  const total = Number(order.total);
  const sudahTerbayar = order.piutang ? Number(order.piutang.totalTerbayar) : 0;
  const sisaTagihan = total - sudahTerbayar;

  if (input.jumlah > sisaTagihan + 0.5) {
    throw new B2BError(`Jumlah bayar melebihi sisa tagihan (sisa Rp ${sisaTagihan.toLocaleString("id-ID")})`);
  }

  const terbayarBaru = sudahTerbayar + input.jumlah;
  const lunas = terbayarBaru >= total - 0.5; // toleransi pembulatan
  const statusBayarBaru: StatusBayar = lunas ? "LUNAS" : "PARSIAL";

  if (!lunas && !order.piutang && !input.tanggalJatuhTempo) {
    throw new B2BError("Tanggal jatuh tempo wajib diisi untuk pembayaran sebagian (belum lunas)");
  }

  const jatuhTempoBaru = input.tanggalJatuhTempo ? new Date(input.tanggalJatuhTempo) : undefined;

  const statusOrderBaru = hitungStatusOrder({
    adaInvoice: true,
    adaSuratJalan: !!order.suratJalan,
    statusBayar: statusBayarBaru,
  });

  const updated = await prisma.$transaction(async (tx) => {
    let piutangId = order.piutang?.id ?? null;

    if (order.piutang) {
      await tx.piutang.update({
        where: { id: order.piutang.id },
        data: {
          totalTerbayar: terbayarBaru,
          status: statusBayarBaru,
          ...(jatuhTempoBaru ? { jatuhTempo: jatuhTempoBaru } : {}),
        },
      });
    } else {
      // Selalu buat piutang meskipun lunas seketika agar baris Pembayaran bisa tertaut dan dihitung di Arus Kas
      const piutangBaru = await tx.piutang.create({
        data: {
          orderB2BId: order.id,
          pihakNama: order.agen.nama,
          totalTagihan: total,
          totalTerbayar: terbayarBaru,
          jatuhTempo: jatuhTempoBaru ?? new Date(),
          status: statusBayarBaru,
        },
      });
      piutangId = piutangBaru.id;
    }

    if (piutangId) {
      await tx.pembayaran.create({
        data: {
          tipe: "PIUTANG",
          piutangId,
          jumlah: input.jumlah,
          catatan: input.catatan?.trim() || null,
          userId: user.id,
        },
      });
    }

    return tx.orderB2B.update({
      where: { id: order.id },
      data: {
        statusBayar: statusBayarBaru,
        status: statusOrderBaru,
        metodeBayar: input.metodeBayar ?? order.metodeBayar,
        ...(jatuhTempoBaru ? { tanggalJatuhTempo: jatuhTempoBaru } : {}),
      },
      include: { items: true, agen: true, outlet: true, invoice: true, suratJalan: true, piutang: true },
    });
  });

  await catatAudit({
    userId: user.id,
    aksi: "BAYAR_ORDER_B2B",
    entitas: "OrderB2B",
    entitasId: order.id,
    detail: { jumlah: input.jumlah, statusBayarBaru, sisaSetelahBayar: total - terbayarBaru },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// BATAL
// ---------------------------------------------------------------------------

export async function batalOrder(user: AuthUser, orderId: string, alasan?: string) {
  const prisma = getPrisma();

  const order = await prisma.orderB2B.findUnique({
    where: { id: orderId },
    include: { items: true, suratJalan: true },
  });
  if (!order) throw new B2BError("Order tidak ditemukan", 404);
  if (order.status === "BATAL") throw new B2BError("Order sudah dibatalkan sebelumnya");
  if (order.suratJalan || order.status === "DIKIRIM" || order.status === "PARSIAL" || order.status === "LUNAS") {
    throw new B2BError("Order yang sudah dikirim/dibayar tidak bisa dibatalkan dari sini");
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.produkJadi.updateMany({
        where: { id: item.produkJadiId },
        data: { stok: { increment: item.qty } },
      });
      await tx.stokMovementProdukJadi.create({
        data: {
          produkJadiId: item.produkJadiId,
          tipe: "IN",
          qty: item.qty,
          sumber: "ADJUSTMENT",
          referensiId: order.id,
          keterangan: `Pembatalan Order B2B ${order.nomor}`,
        },
      });
    }
    return tx.orderB2B.update({
      where: { id: order.id },
      data: { status: "BATAL" },
      include: { items: true, agen: true, outlet: true, invoice: true, suratJalan: true, piutang: true },
    });
  });

  await catatAudit({
    userId: user.id,
    aksi: "BATAL_ORDER_B2B",
    entitas: "OrderB2B",
    entitasId: order.id,
    detail: { alasan: alasan?.trim() || null },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// SERIALIZE — Decimal -> number sebelum dikirim sebagai JSON
// ---------------------------------------------------------------------------

interface SerializableOrder {
  subtotal: Prisma.Decimal | number;
  total: Prisma.Decimal | number;
  items: Array<Record<string, unknown> & { qty: Prisma.Decimal | number; hargaSatuan: Prisma.Decimal | number; subtotal: Prisma.Decimal | number; hppSatuanSaatItu?: Prisma.Decimal | number | null; produkJadi?: { harga: Prisma.Decimal | number; stok: Prisma.Decimal | number; stokMinimum: Prisma.Decimal | number } & Record<string, unknown> }>;
  piutang?:
    | (Record<string, unknown> & {
        totalTagihan: Prisma.Decimal | number;
        totalTerbayar: Prisma.Decimal | number;
        pembayaran?: Array<Record<string, unknown> & { jumlah: Prisma.Decimal | number }>;
      })
    | null;
  [key: string]: unknown;
}

export function serializeOrder(order: SerializableOrder) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    items: order.items.map((it) => ({
      ...it,
      qty: Number(it.qty),
      hargaSatuan: Number(it.hargaSatuan),
      subtotal: Number(it.subtotal),
      hppSatuanSaatItu: it.hppSatuanSaatItu ? Number(it.hppSatuanSaatItu) : null,
      produkJadi: it.produkJadi
        ? { ...it.produkJadi, harga: Number(it.produkJadi.harga), stok: Number(it.produkJadi.stok), stokMinimum: Number(it.produkJadi.stokMinimum) }
        : undefined,
    })),
    piutang: order.piutang
      ? {
          ...order.piutang,
          totalTagihan: Number(order.piutang.totalTagihan),
          totalTerbayar: Number(order.piutang.totalTerbayar),
          pembayaran: order.piutang.pembayaran?.map((p) => ({ ...p, jumlah: Number(p.jumlah) })),
        }
      : null,
  };
}
