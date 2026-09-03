// Logika alokasi HPP & transaksi pembuatan batch produksi.
// Lihat PRD §7 Business Logic Hardcoded poin 5 untuk rumus alokasi HPP.
//
// Rumus (PRD):
//   totalBiayaBatch      = Σ(bahanBaku.qtyPakai × hargaSatuanSaatItu) + Σ(kemasan.qtyPakai × hargaSatuanSaatItu)
//   totalBeratOutput(x)  = (produkJadi.beratBersih ?? 1[fallback qty]) × qty(x)
//   totalBeratSemuaOutput = Σ totalBeratOutput(x)
//   hppPerGram            = totalBiayaBatch ÷ totalBeratSemuaOutput
//   hppAlokasi(x)         = hppPerGram × totalBeratOutput(x)   -- disimpan di ProduksiOutput.hppAlokasi (TOTAL, bukan per-unit)
//   hppPerUnit(x)         = hppAlokasi(x) ÷ qty(x)
//
// Sudah ditrace manual terhadap contoh PRD (lihat komentar di bawah `hitungAlokasiHPP`).

import { getPrisma } from "@/lib/prisma";
import { buatNomorDokumen } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Bagian 1: fungsi murni alokasi HPP (testable, tanpa I/O)
// ---------------------------------------------------------------------------

export interface BahanBakuLineInput {
  bahanBakuId: string;
  qtyPakai: number;
  qtyWaste?: number;
  hargaSatuanSaatItu: number;
}

export interface KemasanLineInput {
  kemasanId: string;
  qtyPakai: number;
  hargaSatuanSaatItu: number;
}

export interface OutputLineInput {
  produkJadiId: string;
  qty: number;
  /** beratBersih dari ProdukJadi — null kalau produk tidak weight-tracked (fallback ke qty). */
  beratBersih: number | null;
}

export interface OutputLineHasil {
  produkJadiId: string;
  qty: number;
  totalBerat: number;
  /** total HPP teralokasi untuk qty pada line ini (bukan per unit) — ini yang disimpan ke DB. */
  hppAlokasi: number;
  /** HPP per unit produk (turunan tampilan) = hppAlokasi / qty. */
  hppPerUnit: number;
  /** true kalau produk ini tidak punya beratBersih dan dialokasikan pakai qty sebagai proxy berat. */
  beratFallback: boolean;
  /** porsi berat produk ini terhadap total berat semua output batch. */
  porsiBerat: number;
}

export interface HasilAlokasiBatch {
  totalBiayaBahanBaku: number;
  totalBiayaKemasan: number;
  totalBiayaBatch: number;
  totalBeratSemuaOutput: number;
  /** Rp per gram (atau per unit berat proxy). */
  hppPerGram: number;
  output: OutputLineHasil[];
  /** true kalau ada minimal satu produk output yang fallback ke qty (beratBersih null). */
  adaFallbackBerat: boolean;
}

/**
 * Hitung alokasi HPP proporsional terhadap berat/volume output, sesuai PRD §7 poin 5.
 *
 * Self-check terhadap contoh PRD (Total Biaya Batch Rp100.000):
 *   Chili Oil 50gr  × 10  -> totalBerat  500gr
 *   Chili Oil 100gr × 20  -> totalBerat 2.000gr
 *   Chili Oil 500gr × 10  -> totalBerat 5.000gr
 *   totalBeratSemuaOutput = 7.500gr
 *   hppPerGram = 100.000 / 7.500 = 13,3333.../gram
 *   line 50gr : hppAlokasi = 13,3333 × 500   = 6.666,67  -> per unit = 6.666,67/10  = 666,67  (≈ Rp667)
 *   line 100gr: hppAlokasi = 13,3333 × 2.000 = 26.666,67 -> per unit = 26.666,67/20 = 1.333,33 (≈ Rp1.333)
 *   line 500gr: hppAlokasi = 13,3333 × 5.000 = 66.666,67 -> per unit = 66.666,67/10 = 6.666,67 (≈ Rp6.667)
 *   Jumlah alokasi (tanpa pembulatan) = 6.666,67 + 26.666,67 + 66.666,67 = 100.000,00 -> cocok persis dengan tabel PRD.
 */
export function hitungAlokasiHPP(
  bahanBaku: BahanBakuLineInput[],
  kemasan: KemasanLineInput[],
  output: OutputLineInput[]
): HasilAlokasiBatch {
  const totalBiayaBahanBaku = bahanBaku.reduce((sum, b) => sum + (b.qtyPakai + (b.qtyWaste ?? 0)) * b.hargaSatuanSaatItu, 0);
  const totalBiayaKemasan = kemasan.reduce((sum, k) => sum + k.qtyPakai * k.hargaSatuanSaatItu, 0);
  const totalBiayaBatch = totalBiayaBahanBaku + totalBiayaKemasan;

  const withBerat = output.map((o) => {
    const beratFallback = o.beratBersih == null;
    const bobotSatuan = o.beratBersih ?? 1; // fallback: qty sebagai proxy berat
    const totalBerat = bobotSatuan * o.qty;
    return { ...o, totalBerat, beratFallback };
  });

  const totalBeratSemuaOutput = withBerat.reduce((sum, o) => sum + o.totalBerat, 0);
  const hppPerGram = totalBeratSemuaOutput > 0 ? totalBiayaBatch / totalBeratSemuaOutput : 0;

  const hasilOutput: OutputLineHasil[] = withBerat.map((o) => {
    const hppAlokasi = hppPerGram * o.totalBerat;
    const hppPerUnit = o.qty > 0 ? hppAlokasi / o.qty : 0;
    const porsiBerat = totalBeratSemuaOutput > 0 ? o.totalBerat / totalBeratSemuaOutput : 0;
    return {
      produkJadiId: o.produkJadiId,
      qty: o.qty,
      totalBerat: o.totalBerat,
      hppAlokasi,
      hppPerUnit,
      beratFallback: o.beratFallback,
      porsiBerat,
    };
  });

  return {
    totalBiayaBahanBaku,
    totalBiayaKemasan,
    totalBiayaBatch,
    totalBeratSemuaOutput,
    hppPerGram,
    output: hasilOutput,
    adaFallbackBerat: hasilOutput.some((o) => o.beratFallback),
  };
}

// ---------------------------------------------------------------------------
// Bagian 2: transaksi pembuatan batch produksi
// ---------------------------------------------------------------------------

export interface BuatBatchProduksiInput {
  outletId: string;
  userId: string;
  catatan?: string;
  bahanBaku: BahanBakuLineInput[];
  kemasan: KemasanLineInput[];
  output: Array<{ produkJadiId: string; qty: number }>;
}

export interface BuatBatchProduksiHasil {
  id: string;
  nomor: string;
  totalBiaya: number;
  alokasi: HasilAlokasiBatch;
}

/** Error yang boleh ditampilkan langsung ke user (validasi bisnis, bukan bug server). */
export class ProduksiValidationError extends Error {}

/**
 * Jalankan seluruh proses pembuatan batch produksi dalam satu transaksi:
 * validasi stok -> buat batch -> catat pemakaian bahan baku/kemasan (+ kurangi stok)
 * -> catat output (+ tambah stok produk jadi) -> hitung & simpan alokasi HPP.
 *
 * Melempar ProduksiValidationError kalau stok tidak cukup atau input tidak valid —
 * TIDAK PERNAH mengizinkan stok negatif, tidak ada opsi override.
 */
export async function buatBatchProduksi(input: BuatBatchProduksiInput): Promise<BuatBatchProduksiHasil> {
  if (input.bahanBaku.length === 0) {
    throw new ProduksiValidationError("Minimal 1 bahan baku harus diisi.");
  }
  if (input.output.length === 0) {
    throw new ProduksiValidationError("Minimal 1 output produk jadi harus diisi.");
  }
  for (const b of input.bahanBaku) {
    if (!(b.qtyPakai > 0)) throw new ProduksiValidationError("Qty pakai bahan baku harus lebih dari 0.");
    if (b.qtyWaste != null && b.qtyWaste < 0) throw new ProduksiValidationError("Qty waste tidak boleh negatif.");
    if (!(b.hargaSatuanSaatItu >= 0)) throw new ProduksiValidationError("Harga satuan bahan baku tidak valid.");
  }
  for (const k of input.kemasan) {
    if (!(k.qtyPakai > 0)) throw new ProduksiValidationError("Qty pakai kemasan harus lebih dari 0.");
    if (!(k.hargaSatuanSaatItu >= 0)) throw new ProduksiValidationError("Harga satuan kemasan tidak valid.");
  }
  for (const o of input.output) {
    if (!(o.qty > 0)) throw new ProduksiValidationError("Qty output harus lebih dari 0.");
  }

  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const bahanBakuIds = [...new Set(input.bahanBaku.map((b) => b.bahanBakuId))];
    const kemasanIds = [...new Set(input.kemasan.map((k) => k.kemasanId))];
    const produkJadiIds = [...new Set(input.output.map((o) => o.produkJadiId))];

    const [outlet, bahanBakuList, kemasanList, produkJadiList] = await Promise.all([
      tx.outlet.findUnique({ where: { id: input.outletId } }),
      tx.bahanBaku.findMany({ where: { id: { in: bahanBakuIds } } }),
      kemasanIds.length > 0 ? tx.kemasan.findMany({ where: { id: { in: kemasanIds } } }) : Promise.resolve([]),
      tx.produkJadi.findMany({ where: { id: { in: produkJadiIds } } }),
    ]);

    if (!outlet) throw new ProduksiValidationError("Outlet tidak ditemukan.");

    const bahanBakuMap = new Map(bahanBakuList.map((b) => [b.id, b]));
    const kemasanMap = new Map(kemasanList.map((k) => [k.id, k]));
    const produkJadiMap = new Map(produkJadiList.map((p) => [p.id, p]));

    // 1) Validasi stok — blok total kalau ada yang kurang, sebutkan nama item.
    //    Agregasi dulu per item ID (bukan per baris) supaya kalau user input bahan/kemasan
    //    yang sama di lebih dari satu baris, totalnya tetap divalidasi terhadap stok yang sama.
    const kebutuhanBahanBaku = new Map<string, number>();
    for (const line of input.bahanBaku) {
      const butuh = line.qtyPakai + (line.qtyWaste ?? 0);
      kebutuhanBahanBaku.set(line.bahanBakuId, (kebutuhanBahanBaku.get(line.bahanBakuId) ?? 0) + butuh);
    }
    for (const [bahanBakuId, butuh] of kebutuhanBahanBaku) {
      const bb = bahanBakuMap.get(bahanBakuId);
      if (!bb) throw new ProduksiValidationError("Ada bahan baku yang tidak ditemukan di database.");
      if (Number(bb.stok) < butuh) {
        throw new ProduksiValidationError(
          `Stok ${bb.nama} tidak cukup: tersedia ${Number(bb.stok)} ${bb.satuan}, dibutuhkan ${butuh} ${bb.satuan}.`
        );
      }
    }

    const kebutuhanKemasan = new Map<string, number>();
    for (const line of input.kemasan) {
      kebutuhanKemasan.set(line.kemasanId, (kebutuhanKemasan.get(line.kemasanId) ?? 0) + line.qtyPakai);
    }
    for (const [kemasanId, butuh] of kebutuhanKemasan) {
      const k = kemasanMap.get(kemasanId);
      if (!k) throw new ProduksiValidationError("Ada kemasan yang tidak ditemukan di database.");
      if (Number(k.stok) < butuh) {
        throw new ProduksiValidationError(
          `Stok kemasan ${k.nama} tidak cukup: tersedia ${Number(k.stok)} ${k.satuan}, dibutuhkan ${butuh} ${k.satuan}.`
        );
      }
    }
    for (const line of input.output) {
      if (!produkJadiMap.has(line.produkJadiId)) {
        throw new ProduksiValidationError("Ada produk jadi output yang tidak ditemukan di database.");
      }
    }

    // 2) Hitung alokasi HPP
    const alokasi = hitungAlokasiHPP(
      input.bahanBaku,
      input.kemasan,
      input.output.map((o) => ({
        produkJadiId: o.produkJadiId,
        qty: o.qty,
        beratBersih: produkJadiMap.get(o.produkJadiId)?.beratBersih ?? null,
      }))
    );

    const nomor = buatNomorDokumen("PROD");

    // 3) Buat ProduksiBatch
    const batch = await tx.produksiBatch.create({
      data: {
        nomor,
        outletId: input.outletId,
        userId: input.userId,
        catatan: input.catatan || null,
        totalBiaya: alokasi.totalBiayaBatch,
      },
    });

    // 4) Baris Bahan Baku — kurangi stok (qtyPakai + qtyWaste), catat pergerakan OUT
    for (const line of input.bahanBaku) {
      const bb = bahanBakuMap.get(line.bahanBakuId)!;
      const waste = line.qtyWaste ?? 0;
      const totalKurang = line.qtyPakai + waste;

      await tx.produksiBahanBaku.create({
        data: {
          produksiBatchId: batch.id,
          bahanBakuId: line.bahanBakuId,
          qtyPakai: line.qtyPakai,
          qtyWaste: waste,
          hargaSatuanSaatItu: line.hargaSatuanSaatItu,
        },
      });

      const resBahanBaku = await tx.bahanBaku.updateMany({
        where: { id: line.bahanBakuId, stok: { gte: totalKurang } },
        data: { stok: { decrement: totalKurang } },
      });
      if (resBahanBaku.count === 0) {
        throw new ProduksiValidationError(`Stok bahan baku tidak mencukupi untuk diproses, kemungkinan ada transaksi bersamaan.`);
      }

      await tx.stokMovementBahanBaku.create({
        data: {
          bahanBakuId: line.bahanBakuId,
          tipe: "OUT",
          qty: totalKurang,
          sumber: "PRODUKSI_PAKAI",
          referensiId: batch.id,
          keterangan:
            waste > 0
              ? `Batch ${nomor}: pakai ${line.qtyPakai} ${bb.satuan} + waste ${waste} ${bb.satuan}`
              : `Batch ${nomor}: pakai produksi`,
        },
      });
    }

    // 5) Baris Kemasan — kurangi stok, catat pergerakan OUT
    for (const line of input.kemasan) {
      await tx.produksiKemasan.create({
        data: {
          produksiBatchId: batch.id,
          kemasanId: line.kemasanId,
          qtyPakai: line.qtyPakai,
          hargaSatuanSaatItu: line.hargaSatuanSaatItu,
        },
      });

      const resKemasan = await tx.kemasan.updateMany({
        where: { id: line.kemasanId, stok: { gte: line.qtyPakai } },
        data: { stok: { decrement: line.qtyPakai } },
      });
      if (resKemasan.count === 0) {
        throw new ProduksiValidationError(`Stok kemasan tidak mencukupi untuk diproses, kemungkinan ada transaksi bersamaan.`);
      }

      await tx.stokMovementKemasan.create({
        data: {
          kemasanId: line.kemasanId,
          tipe: "OUT",
          qty: line.qtyPakai,
          sumber: "PRODUKSI_PAKAI",
          referensiId: batch.id,
          keterangan: `Batch ${nomor}: pakai produksi`,
        },
      });
    }

    // 6) Baris Output — tambah stok produk jadi, simpan hppAlokasi, catat pergerakan IN
    for (const line of alokasi.output) {
      await tx.produksiOutput.create({
        data: {
          produksiBatchId: batch.id,
          produkJadiId: line.produkJadiId,
          qty: line.qty,
          hppAlokasi: line.hppAlokasi,
        },
      });

      await tx.produkJadi.update({
        where: { id: line.produkJadiId },
        data: { stok: { increment: line.qty } },
      });

      await tx.stokMovementProdukJadi.create({
        data: {
          produkJadiId: line.produkJadiId,
          tipe: "IN",
          qty: line.qty,
          sumber: "PRODUKSI_MASUK",
          referensiId: batch.id,
          keterangan: `Batch ${nomor}: hasil produksi`,
        },
      });
    }

    return {
      id: batch.id,
      nomor: batch.nomor,
      totalBiaya: alokasi.totalBiayaBatch,
      alokasi,
    };
  });
}
