// Logika bisnis POS (Retail) — dipisah dari route handler.
// Referensi: PRD §3.2 & §4 "Flow: Penjualan POS".

import { getPrisma } from "@/lib/prisma";
import { buatNomorDokumen } from "@/lib/utils";
import { catatAudit, type AuthUser } from "@/lib/api-helpers";
import { getLatestHppPerUnitMap } from "@/lib/finance";

export type MetodeBayarPOSInput = "CASH" | "TRANSFER_QRIS" | "KREDIT";
export type KreditTipeInput = "LANGSUNG_LUNAS" | "PARSIAL";
export type StatusBayarValue = "LUNAS" | "PARSIAL" | "BELUM_BAYAR";

/** Error bisnis yang aman ditampilkan ke user (bukan error server internal). */
export class PosError extends Error {}

export interface OrderPOSItemInput {
  produkJadiId: string;
  qty: number;
  hargaSatuan: number;
}

export interface CreateOrderPOSInput {
  customerId: string;
  outletId: string;
  items: OrderPOSItemInput[];
  metodeBayar: MetodeBayarPOSInput;
  kreditTipe?: KreditTipeInput;
  tanggalJatuhTempo?: string; // ISO date, wajib kalau metodeBayar KREDIT
  bayarSekarang?: number; // hanya dipakai kalau kreditTipe PARSIAL
  catatan?: string;
}

export function hitungTotalItems(items: OrderPOSItemInput[]): number {
  return items.reduce((sum, it) => sum + it.qty * it.hargaSatuan, 0);
}

function validasiInput(input: CreateOrderPOSInput) {
  if (!input.customerId) throw new PosError("Customer wajib dipilih");
  if (!input.outletId) throw new PosError("Outlet wajib dipilih");
  if (!input.items || input.items.length === 0) {
    throw new PosError("Minimal 1 produk harus ditambahkan");
  }
  for (const it of input.items) {
    if (!it.produkJadiId) throw new PosError("Produk pada salah satu baris tidak valid");
    if (!(Number(it.qty) > 0)) throw new PosError("Qty setiap produk harus lebih dari 0");
    if (!(Number(it.hargaSatuan) >= 0)) throw new PosError("Harga satuan tidak valid");
  }
  if (input.metodeBayar === "KREDIT") {
    if (!input.kreditTipe) {
      throw new PosError('Pilih "Langsung Lunas" atau "Parsial" untuk pembayaran Kredit');
    }
    if (!input.tanggalJatuhTempo) {
      throw new PosError("Tanggal jatuh tempo wajib diisi untuk pembayaran Kredit");
    }
    if (Number.isNaN(new Date(input.tanggalJatuhTempo).getTime())) {
      throw new PosError("Tanggal jatuh tempo tidak valid");
    }
  }
}

function tentukanStatusBayar(
  input: CreateOrderPOSInput,
  total: number
): { statusBayar: StatusBayarValue; totalTerbayar: number } {
  if (input.metodeBayar !== "KREDIT") {
    return { statusBayar: "LUNAS", totalTerbayar: total };
  }
  if (input.kreditTipe === "LANGSUNG_LUNAS") {
    return { statusBayar: "LUNAS", totalTerbayar: total };
  }
  // Parsial
  const dp = Math.max(0, Number(input.bayarSekarang ?? 0));
  if (total > 0 && dp >= total) return { statusBayar: "LUNAS", totalTerbayar: total };
  if (dp > 0) return { statusBayar: "PARSIAL", totalTerbayar: dp };
  return { statusBayar: "BELUM_BAYAR", totalTerbayar: 0 };
}

/**
 * Buat Order POS baru dalam satu transaksi:
 * - Validasi stok tiap produk (blok total kalau ada yang kurang, tanpa opsi override).
 * - Kurangi stok Produk Jadi + catat StokMovementProdukJadi (OUT, sumber PENJUALAN_POS).
 * - Buat OrderPOS + OrderPOSItem[].
 * - Kalau belum lunas (Kredit belum/parsial bayar), buat Piutang terkait.
 */
export async function buatOrderPOS(user: AuthUser, input: CreateOrderPOSInput) {
  validasiInput(input);

  const prisma = getPrisma();
  const subtotal = hitungTotalItems(input.items);
  const total = subtotal; // belum ada diskon/pajak di versi ini
  const { statusBayar, totalTerbayar } = tentukanStatusBayar(input, total);

  // Ambil snapshot HPP saat ini
  const hppMap = await getLatestHppPerUnitMap();

  const order = await prisma.$transaction(async (tx) => {
    // Gabungkan qty per produk (kalau user menambah baris untuk produk yang sama)
    const qtyPerProduk = new Map<string, number>();
    for (const it of input.items) {
      qtyPerProduk.set(it.produkJadiId, (qtyPerProduk.get(it.produkJadiId) ?? 0) + Number(it.qty));
    }

    const produkList = await tx.produkJadi.findMany({
      where: { id: { in: [...qtyPerProduk.keys()] } },
    });
    const produkMap = new Map(produkList.map((p) => [p.id, p]));

    for (const [produkId, qtyDiminta] of qtyPerProduk) {
      const produk = produkMap.get(produkId);
      if (!produk) throw new PosError("Salah satu produk tidak ditemukan di database");
      const stokTersedia = Number(produk.stok);
      if (stokTersedia < qtyDiminta) {
        throw new PosError(
          `Stok "${produk.nama}" tidak cukup (tersedia ${stokTersedia}, dibutuhkan ${qtyDiminta})`
        );
      }
    }

    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new PosError("Customer tidak ditemukan");

    const outlet = await tx.outlet.findUnique({ where: { id: input.outletId } });
    if (!outlet) throw new PosError("Outlet tidak ditemukan");

    const nomor = buatNomorDokumen("POS");
    const tanggalJatuhTempo =
      input.metodeBayar === "KREDIT" && input.tanggalJatuhTempo
        ? new Date(input.tanggalJatuhTempo)
        : null;

    const created = await tx.orderPOS.create({
      data: {
        nomor,
        customerId: input.customerId,
        outletId: input.outletId,
        userId: user.id,
        metodeBayar: input.metodeBayar,
        statusBayar,
        tanggalJatuhTempo,
        subtotal,
        total,
        catatan: input.catatan?.trim() || null,
        items: {
          create: input.items.map((it) => ({
            produkJadiId: it.produkJadiId,
            qty: it.qty,
            hargaSatuan: it.hargaSatuan,
            subtotal: it.qty * it.hargaSatuan,
            hppSatuanSaatItu: hppMap.get(it.produkJadiId)?.hppPerUnit ?? 0,
          })),
        },
      },
      include: {
        items: { include: { produkJadi: true } },
        customer: true,
        outlet: true,
      },
    });

    for (const [produkId, qtyDiminta] of qtyPerProduk) {
      const res = await tx.produkJadi.updateMany({
        where: { id: produkId, stok: { gte: qtyDiminta } },
        data: { stok: { decrement: qtyDiminta } },
      });
      if (res.count === 0) {
        throw new PosError(`Stok tidak mencukupi untuk diproses, kemungkinan ada transaksi bersamaan.`);
      }
      await tx.stokMovementProdukJadi.create({
        data: {
          produkJadiId: produkId,
          tipe: "OUT",
          qty: qtyDiminta,
          sumber: "PENJUALAN_POS",
          referensiId: created.id,
          keterangan: `Penjualan POS ${nomor}`,
        },
      });
    }

    // Selalu buat piutang untuk menampung riwayat pembayaran, bahkan untuk CASH lunas
    const piutang = await tx.piutang.create({
      data: {
        orderPOSId: created.id,
        pihakNama: customer.nama,
        totalTagihan: total,
        totalTerbayar,
        jatuhTempo: tanggalJatuhTempo ?? new Date(),
        status: statusBayar,
      },
    });

    if (totalTerbayar > 0) {
      await tx.pembayaran.create({
        data: {
          tipe: "PIUTANG",
          piutangId: piutang.id,
          jumlah: totalTerbayar,
          catatan: input.catatan?.trim() || "Pembayaran POS",
          userId: user.id,
        },
      });
    }

    return created;
  });

  await catatAudit({
    userId: user.id,
    aksi: "CREATE",
    entitas: "OrderPOS",
    entitasId: order.id,
    detail: { nomor: order.nomor, total, statusBayar },
  });

  return order;
}

/**
 * Batalkan Order POS:
 * - Kembalikan stok Produk Jadi.
 * - Hapus Pembayaran dan Piutang terkait.
 * - Hapus Order POS (Cascade akan menghapus items).
 */
export async function batalOrderPOS(user: AuthUser, id: string) {
  const prisma = getPrisma();
  
  const order = await prisma.orderPOS.findUnique({
    where: { id },
    include: {
      items: true,
      piutang: { include: { pembayaran: true } }
    }
  });

  if (!order) throw new PosError("Order POS tidak ditemukan");

  await prisma.$transaction(async (tx) => {
    // Kembalikan stok
    for (const it of order.items) {
      await tx.produkJadi.update({
        where: { id: it.produkJadiId },
        data: { stok: { increment: Number(it.qty) } },
      });
      await tx.stokMovementProdukJadi.create({
        data: {
          produkJadiId: it.produkJadiId,
          tipe: "IN",
          qty: it.qty,
          sumber: "PENJUALAN_POS",
          referensiId: order.id,
          keterangan: `Batal POS ${order.nomor}`,
        },
      });
    }

    // Hapus Piutang & Pembayaran
    if (order.piutang) {
      await tx.pembayaran.deleteMany({
        where: { piutangId: order.piutang.id },
      });
      await tx.piutang.delete({
        where: { id: order.piutang.id },
      });
    }

    // Hapus Order (cascade items)
    await tx.orderPOS.delete({
      where: { id },
    });
  });

  await catatAudit({
    userId: user.id,
    aksi: "DELETE",
    entitas: "OrderPOS",
    entitasId: order.id,
    detail: { nomor: order.nomor },
  });
}

// ---------------------------------------------------------------------------
// Serialisasi — konversi Decimal Prisma ke number supaya aman di-JSON-kan.
// ---------------------------------------------------------------------------

export function serializeOrderItem(item: {
  id: string;
  produkJadiId: string;
  qty: unknown;
  hargaSatuan: unknown;
  subtotal: unknown;
  hppSatuanSaatItu?: unknown;
  produkJadi?: { nama: string; satuan: string } | null;
}) {
  return {
    id: item.id,
    produkJadiId: item.produkJadiId,
    namaProduk: item.produkJadi?.nama ?? "",
    satuan: item.produkJadi?.satuan ?? "",
    qty: Number(item.qty),
    hargaSatuan: Number(item.hargaSatuan),
    subtotal: Number(item.subtotal),
    hppSatuanSaatItu: item.hppSatuanSaatItu ? Number(item.hppSatuanSaatItu) : null,
  };
}

export function serializeOrderPOS(order: {
  id: string;
  nomor: string;
  customerId: string;
  outletId: string;
  userId: string;
  metodeBayar: string;
  statusBayar: string;
  tanggalJatuhTempo: Date | null;
  subtotal: unknown;
  total: unknown;
  catatan: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { id: string; nama: string; kontak: string | null } | null;
  outlet?: { id: string; nama: string } | null;
  user?: { id: string; nama: string } | null;
  items?: Array<{
    id: string;
    produkJadiId: string;
    qty: unknown;
    hargaSatuan: unknown;
    subtotal: unknown;
    hppSatuanSaatItu?: unknown;
    produkJadi?: { nama: string; satuan: string } | null;
  }>;
  piutang?: {
    id: string;
    totalTagihan: unknown;
    totalTerbayar: unknown;
    jatuhTempo: Date;
    status: string;
  } | null;
}) {
  return {
    id: order.id,
    nomor: order.nomor,
    customerId: order.customerId,
    outletId: order.outletId,
    userId: order.userId,
    metodeBayar: order.metodeBayar,
    statusBayar: order.statusBayar,
    tanggalJatuhTempo: order.tanggalJatuhTempo,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    catatan: order.catatan,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.customer ? { id: order.customer.id, nama: order.customer.nama, kontak: order.customer.kontak } : null,
    outlet: order.outlet ? { id: order.outlet.id, nama: order.outlet.nama } : null,
    user: order.user ? { id: order.user.id, nama: order.user.nama } : null,
    items: order.items?.map(serializeOrderItem) ?? [],
    piutang: order.piutang
      ? {
          id: order.piutang.id,
          totalTagihan: Number(order.piutang.totalTagihan),
          totalTerbayar: Number(order.piutang.totalTerbayar),
          jatuhTempo: order.piutang.jatuhTempo,
          status: order.piutang.status,
        }
      : null,
  };
}
