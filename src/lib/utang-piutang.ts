// Logika bisnis Utang & Piutang — dipisah dari route handler.
// Referensi: PRD §3.4 "Utang & Piutang" & §4 "Flow: Pembayaran Utang/Piutang".
//
// CATATAN SCOPE: Piutang dibuat oleh modul POS & B2B (lib/pos.ts, lib/b2b.ts) saat
// transaksi Kredit belum lunas. Modul ini hanya MEMBACA Piutang dan mencatat
// Pembayaran terhadapnya — tidak pernah membuat/menghapus baris Piutang.

import { getPrisma } from "@/lib/prisma";
import { catatAudit, type AuthUser } from "@/lib/api-helpers";
import { buatNomorDokumen } from "@/lib/utils";

export type StatusBayarValue = "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
export type SumberUtangValue = "PEMBELIAN" | "PINJAMAN" | "INVESTOR";
export type TipePembayaranValue = "PIUTANG" | "UTANG";

/** Error bisnis yang aman ditampilkan ke user (bukan error server internal). */
export class UtangPiutangError extends Error {}

/** Toleransi pembulatan uang (Rupiah/sen) supaya perbandingan float tidak meleset. */
const EPSILON = 0.01;

/** Hitung status bayar dari total tagihan & total sudah dibayar. */
export function hitungStatusBayar(totalTagihan: number, totalTerbayar: number): StatusBayarValue {
  if (totalTerbayar <= EPSILON) return "BELUM_BAYAR";
  if (totalTerbayar >= totalTagihan - EPSILON) return "LUNAS";
  return "PARSIAL";
}

// ---------------------------------------------------------------------------
// PEMBAYARAN (dipakai sama untuk tab Utang maupun Piutang)
// ---------------------------------------------------------------------------

export interface RekamPembayaranInput {
  tipe: TipePembayaranValue;
  id: string; // piutangId atau utangId
  jumlah: number;
  catatan?: string | null;
  tanggal?: string; // ISO date, default sekarang
}

function validasiJumlah(jumlah: number) {
  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    throw new UtangPiutangError("Jumlah pembayaran harus lebih dari 0");
  }
}

/**
 * Catat pembayaran (cicilan/pelunasan) untuk satu Piutang atau Utang.
 * - Validasi: jumlah > 0 dan tidak melebihi sisa tagihan.
 * - Insert Pembayaran, update totalTerbayar & status parent, dalam satu $transaction.
 */
export async function rekamPembayaran(user: AuthUser, input: RekamPembayaranInput) {
  validasiJumlah(input.jumlah);
  const prisma = getPrisma();
  const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();
  if (Number.isNaN(tanggal.getTime())) throw new UtangPiutangError("Tanggal pembayaran tidak valid");

  const result = await prisma.$transaction(async (tx) => {
    if (input.tipe === "PIUTANG") {
      const piutang = await tx.piutang.findUnique({ where: { id: input.id } });
      if (!piutang) throw new UtangPiutangError("Piutang tidak ditemukan");
      if (piutang.status === "LUNAS") throw new UtangPiutangError("Piutang ini sudah lunas");

      const totalTagihan = Number(piutang.totalTagihan);
      const totalTerbayarLama = Number(piutang.totalTerbayar);
      const sisa = totalTagihan - totalTerbayarLama;
      if (input.jumlah > sisa + EPSILON) {
        throw new UtangPiutangError(
          `Jumlah pembayaran (${input.jumlah}) melebihi sisa tagihan (${sisa})`
        );
      }

      const pembayaran = await tx.pembayaran.create({
        data: {
          tipe: "PIUTANG",
          piutangId: input.id,
          jumlah: input.jumlah,
          tanggal,
          catatan: input.catatan?.trim() || null,
          userId: user.id,
        },
      });

      const totalTerbayarBaru = totalTerbayarLama + input.jumlah;
      const status = hitungStatusBayar(totalTagihan, totalTerbayarBaru);
      const updated = await tx.piutang.update({
        where: { id: input.id },
        data: { totalTerbayar: totalTerbayarBaru, status },
      });

      return { pembayaran, parent: updated };
    }

    const utang = await tx.utang.findUnique({ where: { id: input.id } });
    if (!utang) throw new UtangPiutangError("Utang tidak ditemukan");
    if (utang.status === "LUNAS") throw new UtangPiutangError("Utang ini sudah lunas");

    const totalUtang = Number(utang.totalUtang);
    const totalTerbayarLama = Number(utang.totalTerbayar);
    const sisa = totalUtang - totalTerbayarLama;
    if (input.jumlah > sisa + EPSILON) {
      throw new UtangPiutangError(
        `Jumlah pembayaran (${input.jumlah}) melebihi sisa utang (${sisa})`
      );
    }

    const pembayaran = await tx.pembayaran.create({
      data: {
        tipe: "UTANG",
        utangId: input.id,
        jumlah: input.jumlah,
        tanggal,
        catatan: input.catatan?.trim() || null,
        userId: user.id,
      },
    });

    const totalTerbayarBaru = totalTerbayarLama + input.jumlah;
    const status = hitungStatusBayar(totalUtang, totalTerbayarBaru);
    const updated = await tx.utang.update({
      where: { id: input.id },
      data: { totalTerbayar: totalTerbayarBaru, status },
    });

    return { pembayaran, parent: updated };
  });

  await catatAudit({
    userId: user.id,
    aksi: "CREATE",
    entitas: "Pembayaran",
    entitasId: result.pembayaran.id,
    detail: { tipe: input.tipe, refId: input.id, jumlah: input.jumlah },
  });

  return result;
}

// ---------------------------------------------------------------------------
// PEMBELIAN → Supplier + stok masuk + Utang otomatis
// ---------------------------------------------------------------------------

export interface ItemPembelianInput {
  bahanBakuId?: string | null;
  kemasanId?: string | null;
  qty: number;
  hargaSatuan: number;
}

export interface BuatPembelianInput {
  supplierId: string;
  outletId?: string | null;
  tanggal?: string; // ISO date
  keterangan?: string | null;
  items: ItemPembelianInput[];
  jatuhTempo: string; // ISO date
}

function validasiItemPembelian(items: ItemPembelianInput[]) {
  if (!items || items.length === 0) {
    throw new UtangPiutangError("Minimal 1 item pembelian harus ditambahkan");
  }
  for (const it of items) {
    const pilihBahanBaku = Boolean(it.bahanBakuId);
    const pilihKemasan = Boolean(it.kemasanId);
    if (pilihBahanBaku === pilihKemasan) {
      throw new UtangPiutangError(
        "Setiap item pembelian harus pilih tepat satu: Bahan Baku atau Kemasan"
      );
    }
    if (!(Number(it.qty) > 0)) throw new UtangPiutangError("Qty setiap item harus lebih dari 0");
    if (!(Number(it.hargaSatuan) >= 0)) throw new UtangPiutangError("Harga satuan tidak valid");
  }
}

/**
 * Catat Pembelian baru dari Supplier dalam satu transaksi:
 * - Buat Pembelian + PembelianItem[].
 * - Tambah stok BahanBaku/Kemasan sesuai item + catat StokMovement (IN, sumber PEMBELIAN).
 * - Buat Utang terkait (sumber PEMBELIAN, pihakNama = nama supplier, totalUtang = total pembelian).
 */
export async function buatPembelian(user: AuthUser, input: BuatPembelianInput) {
  validasiItemPembelian(input.items);

  const jatuhTempo = new Date(input.jatuhTempo);
  if (Number.isNaN(jatuhTempo.getTime())) {
    throw new UtangPiutangError("Tanggal jatuh tempo tidak valid");
  }
  const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();
  if (Number.isNaN(tanggal.getTime())) throw new UtangPiutangError("Tanggal pembelian tidak valid");

  const prisma = getPrisma();
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new UtangPiutangError("Supplier tidak ditemukan");

  if (input.outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: input.outletId } });
    if (!outlet) throw new UtangPiutangError("Outlet tidak ditemukan");
  }

  const total = input.items.reduce((sum, it) => sum + Number(it.qty) * Number(it.hargaSatuan), 0);
  const nomor = buatNomorDokumen("PB");

  const { pembelian, utang } = await prisma.$transaction(async (tx) => {
    const pembelianBaru = await tx.pembelian.create({
      data: {
        nomor,
        supplierId: input.supplierId,
        outletId: input.outletId || null,
        userId: user.id,
        tanggal,
        keterangan: input.keterangan?.trim() || null,
        total,
        items: {
          create: input.items.map((it) => ({
            bahanBakuId: it.bahanBakuId || null,
            kemasanId: it.kemasanId || null,
            qty: it.qty,
            hargaSatuan: it.hargaSatuan,
            subtotal: Number(it.qty) * Number(it.hargaSatuan),
          })),
        },
      },
      include: { items: true },
    });

    for (const item of pembelianBaru.items) {
      if (item.bahanBakuId) {
        const bb = await tx.bahanBaku.findUnique({ where: { id: item.bahanBakuId } });
        if (!bb) throw new UtangPiutangError("Salah satu Bahan Baku tidak ditemukan");
        await tx.bahanBaku.update({
          where: { id: item.bahanBakuId },
          data: { stok: { increment: item.qty } },
        });
        await tx.stokMovementBahanBaku.create({
          data: {
            bahanBakuId: item.bahanBakuId,
            tipe: "IN",
            qty: item.qty,
            sumber: "PEMBELIAN",
            referensiId: pembelianBaru.id,
            tanggal,
            keterangan: `Pembelian ${nomor} dari ${supplier.nama}`,
          },
        });
      } else if (item.kemasanId) {
        const km = await tx.kemasan.findUnique({ where: { id: item.kemasanId } });
        if (!km) throw new UtangPiutangError("Salah satu Kemasan tidak ditemukan");
        await tx.kemasan.update({
          where: { id: item.kemasanId },
          data: { stok: { increment: item.qty } },
        });
        await tx.stokMovementKemasan.create({
          data: {
            kemasanId: item.kemasanId,
            tipe: "IN",
            qty: item.qty,
            sumber: "PEMBELIAN",
            referensiId: pembelianBaru.id,
            tanggal,
            keterangan: `Pembelian ${nomor} dari ${supplier.nama}`,
          },
        });
      }
    }

    const utangBaru = await tx.utang.create({
      data: {
        sumber: "PEMBELIAN",
        pembelianId: pembelianBaru.id,
        pihakNama: supplier.nama,
        totalUtang: total,
        jatuhTempo,
        status: "BELUM_BAYAR",
      },
    });

    return { pembelian: pembelianBaru, utang: utangBaru };
  });

  await catatAudit({
    userId: user.id,
    aksi: "CREATE",
    entitas: "Pembelian",
    entitasId: pembelian.id,
    detail: { nomor, total, supplierId: input.supplierId },
  });
  await catatAudit({
    userId: user.id,
    aksi: "CREATE",
    entitas: "Utang",
    entitasId: utang.id,
    detail: { sumber: "PEMBELIAN", totalUtang: total, pembelianId: pembelian.id },
  });

  return { pembelian, utang };
}

// ---------------------------------------------------------------------------
// UTANG STANDALONE — Pinjaman / Investor (tanpa Pembelian)
// ---------------------------------------------------------------------------

export interface BuatUtangStandaloneInput {
  sumber: "PINJAMAN" | "INVESTOR";
  pihakNama: string;
  jumlah: number;
  jatuhTempo: string; // ISO date
  keterangan?: string | null;
}

export async function buatUtangStandalone(user: AuthUser, input: BuatUtangStandaloneInput) {
  if (input.sumber !== "PINJAMAN" && input.sumber !== "INVESTOR") {
    throw new UtangPiutangError("Sumber utang harus Pinjaman atau Investor");
  }
  const pihakNama = input.pihakNama?.trim();
  if (!pihakNama) throw new UtangPiutangError("Nama pihak wajib diisi");
  validasiJumlah(input.jumlah);
  const jatuhTempo = new Date(input.jatuhTempo);
  if (Number.isNaN(jatuhTempo.getTime())) {
    throw new UtangPiutangError("Tanggal jatuh tempo tidak valid");
  }

  const utang = await getPrisma().utang.create({
    data: {
      sumber: input.sumber,
      pihakNama,
      totalUtang: input.jumlah,
      jatuhTempo,
      keterangan: input.keterangan?.trim() || null,
      status: "BELUM_BAYAR",
    },
  });

  await catatAudit({
    userId: user.id,
    aksi: "CREATE",
    entitas: "Utang",
    entitasId: utang.id,
    detail: { sumber: input.sumber, jumlah: input.jumlah, pihakNama },
  });

  return utang;
}

// ---------------------------------------------------------------------------
// SERIALISASI — konversi Decimal Prisma ke number supaya aman di-JSON-kan.
// ---------------------------------------------------------------------------

export function serializePiutang(p: {
  id: string;
  pihakNama: string;
  totalTagihan: unknown;
  totalTerbayar: unknown;
  jatuhTempo: Date;
  status: string;
  createdAt: Date;
  orderPOS?: { nomor: string; outlet?: { nama: string } | null } | null;
  orderB2B?: { nomor: string; outlet?: { nama: string } | null } | null;
}) {
  const totalTagihan = Number(p.totalTagihan);
  const totalTerbayar = Number(p.totalTerbayar);
  const sumber = p.orderPOS ? "POS" : p.orderB2B ? "B2B" : null;
  const nomorTransaksi = p.orderPOS?.nomor ?? p.orderB2B?.nomor ?? null;
  const outletNama = p.orderPOS?.outlet?.nama ?? p.orderB2B?.outlet?.nama ?? null;
  return {
    id: p.id,
    pihakNama: p.pihakNama,
    totalTagihan,
    totalTerbayar,
    sisa: Math.max(0, totalTagihan - totalTerbayar),
    jatuhTempo: p.jatuhTempo,
    status: p.status,
    sumber,
    nomorTransaksi,
    outletNama,
    createdAt: p.createdAt,
  };
}

export function serializeUtang(u: {
  id: string;
  sumber: string;
  pihakNama: string;
  keterangan: string | null;
  totalUtang: unknown;
  totalTerbayar: unknown;
  jatuhTempo: Date;
  status: string;
  createdAt: Date;
  pembelian?: { nomor: string; outlet?: { nama: string } | null } | null;
}) {
  const totalUtang = Number(u.totalUtang);
  const totalTerbayar = Number(u.totalTerbayar);
  return {
    id: u.id,
    sumber: u.sumber,
    pihakNama: u.pihakNama,
    keterangan: u.keterangan,
    totalUtang,
    totalTerbayar,
    sisa: Math.max(0, totalUtang - totalTerbayar),
    jatuhTempo: u.jatuhTempo,
    status: u.status,
    nomorPembelian: u.pembelian?.nomor ?? null,
    outletNama: u.pembelian?.outlet?.nama ?? null,
    createdAt: u.createdAt,
  };
}

export function serializePembayaran(p: {
  id: string;
  jumlah: unknown;
  tanggal: Date;
  catatan: string | null;
  user?: { nama: string } | null;
}) {
  return {
    id: p.id,
    jumlah: Number(p.jumlah),
    tanggal: p.tanggal,
    catatan: p.catatan,
    dicatatOleh: p.user?.nama ?? "-",
  };
}
