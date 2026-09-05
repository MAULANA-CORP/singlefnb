// Logika alokasi HPP & transaksi pembuatan Proses dan Output produksi.
// 2-step flow: Proses (input bahan baku, kurangi stok) → Output (produk jadi + kemasan, hitung HPP).
//
// Rumus HPP (PRD §7):
//   totalBiayaBatch      = Σ(biaya dari semua Proses terkait) + Σ(kemasan.qtyPakai × hargaSatuanSaatItu)
//   totalBeratOutput(x)  = (produkJadi.beratBersih ?? 1[fallback qty]) × qty(x)
//   totalBeratSemuaOutput = Σ totalBeratOutput(x)
//   hppPerGram            = totalBiayaBatch ÷ totalBeratSemuaOutput
//   hppAlokasi(x)         = hppPerGram × totalBeratOutput(x)

import { getPrisma } from "@/lib/prisma";
import { buatNomorDokumen } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Bagian 1: fungsi murni alokasi HPP (testable, tanpa I/O)
// ---------------------------------------------------------------------------

export interface BahanBakuLineInput {
  bahanBakuId: string;
  qtyPakai: number;
  qtyWaste?: number;
  hargaSatuanSaatItu?: number; // optional — jika tidak dikirim, ambil dari hargaRataRata DB
}

export interface KemasanLineInput {
  kemasanId: string;
  qtyPakai: number;
  hargaSatuanSaatItu: number;
}

export interface BiayaLainLineInput {
  kategori: string;
  jumlah: number;
  catatan?: string;
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
  totalBiayaLain: number;
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
 * Pada flow baru, bahanBaku input sudah berupa biaya total dari semua Proses terkait
 * (sudah dihitung saat Proses dibuat), bukan per-line bahan baku lagi.
 * Jadi bahanBaku array biasanya 1 entry dengan qtyPakai=1 dan hargaSatuanSaatItu = totalBiayaProses.
 */
export function hitungAlokasiHPP(
  bahanBaku: BahanBakuLineInput[],
  kemasan: KemasanLineInput[],
  output: OutputLineInput[],
  biayaLain: BiayaLainLineInput[] = []
): HasilAlokasiBatch {
  const totalBiayaBahanBaku = bahanBaku.reduce((sum, b) => sum + (b.qtyPakai + (b.qtyWaste ?? 0)) * (b.hargaSatuanSaatItu ?? 0), 0);
  const totalBiayaKemasan = kemasan.reduce((sum, k) => sum + k.qtyPakai * k.hargaSatuanSaatItu, 0);
  const totalBiayaLain = biayaLain.reduce((sum, bl) => sum + bl.jumlah, 0);
  const totalBiayaBatch = totalBiayaBahanBaku + totalBiayaKemasan + totalBiayaLain;

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
    totalBiayaLain,
    totalBiayaBatch,
    totalBeratSemuaOutput,
    hppPerGram,
    output: hasilOutput,
    adaFallbackBerat: hasilOutput.some((o) => o.beratFallback),
  };
}

// ---------------------------------------------------------------------------
// Bagian 2: transaksi pembuatan Proses (Step 1)
// ---------------------------------------------------------------------------

export interface BuatProsesInput {
  outletId: string;
  userId: string;
  nama?: string;
  catatan?: string;
  bahanBaku: BahanBakuLineInput[];
}

export interface BuatProsesHasil {
  id: string;
  nomor: string;
  totalBiaya: number;
}

/** Error yang boleh ditampilkan langsung ke user (validasi bisnis, bukan bug server). */
export class ProduksiValidationError extends Error {}

/**
 * Buat Proses baru (Step 1): validasi stok → buat Proses → catat pemakaian bahan baku (+ kurangi stok).
 * Stok bahan baku langsung dikurangi saat Proses dibuat.
 */
export async function buatProses(input: BuatProsesInput): Promise<BuatProsesHasil> {
  if (input.bahanBaku.length === 0) {
    throw new ProduksiValidationError("Minimal 1 bahan baku harus diisi.");
  }
  for (const b of input.bahanBaku) {
    if (!(b.qtyPakai > 0)) throw new ProduksiValidationError("Qty pakai bahan baku harus lebih dari 0.");
    if (b.qtyWaste != null && b.qtyWaste < 0) throw new ProduksiValidationError("Qty waste tidak boleh negatif.");
  }

  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const bahanBakuIds = [...new Set(input.bahanBaku.map((b) => b.bahanBakuId))];

    const [outlet, bahanBakuList] = await Promise.all([
      tx.outlet.findUnique({ where: { id: input.outletId } }),
      tx.bahanBaku.findMany({ where: { id: { in: bahanBakuIds } } }),
    ]);

    if (!outlet) throw new ProduksiValidationError("Outlet tidak ditemukan.");

    const bahanBakuMap = new Map(bahanBakuList.map((b) => [b.id, b]));

    // Validasi stok + resolve harga dari DB jika tidak dikirim
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

    // 2) Resolve harga dari DB (average cost) & hitung total biaya
    for (const line of input.bahanBaku) {
      if (line.hargaSatuanSaatItu == null) {
        const bb = bahanBakuMap.get(line.bahanBakuId);
        line.hargaSatuanSaatItu = bb ? Number(bb.hargaRataRata) : 0;
      }
    }
    const totalBiaya = input.bahanBaku.reduce(
      (sum, b) => sum + (b.qtyPakai + (b.qtyWaste ?? 0)) * b.hargaSatuanSaatItu!,
      0
    );

    const nomor = buatNomorDokumen("PRS");

    // 3) Buat Proses
    const proses = await tx.proses.create({
      data: {
        nomor,
        outletId: input.outletId,
        userId: input.userId,
        nama: input.nama || null,
        catatan: input.catatan || null,
        status: "DRAFT",
      },
    });

    // 4) Baris Bahan Baku — kurangi stok, catat pergerakan OUT
    for (const line of input.bahanBaku) {
      const bb = bahanBakuMap.get(line.bahanBakuId)!;
      const waste = line.qtyWaste ?? 0;
      const totalKurang = line.qtyPakai + waste;

      await tx.prosesBahanBaku.create({
        data: {
          prosesId: proses.id,
          bahanBakuId: line.bahanBakuId,
          qtyPakai: line.qtyPakai,
          qtyWaste: waste,
          hargaSatuanSaatItu: line.hargaSatuanSaatItu!,
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
          referensiId: proses.id,
          keterangan:
            waste > 0
              ? `Proses ${nomor}: pakai ${line.qtyPakai} ${bb.satuan} + waste ${waste} ${bb.satuan}`
              : `Proses ${nomor}: pakai produksi`,
        },
      });
    }

    return {
      id: proses.id,
      nomor: proses.nomor,
      totalBiaya,
    };
  });
}

// ---------------------------------------------------------------------------
// Bagian 3: transaksi pembuatan Output (Step 2)
// ---------------------------------------------------------------------------

export interface BuatOutputInput {
  outletId: string;
  userId: string;
  catatan?: string;
  prosesIds: string[];
  kemasan: KemasanLineInput[];
  output: Array<{ produkJadiId: string; qty: number }>;
  biayaLain?: BiayaLainLineInput[];
}

export interface BuatOutputHasil {
  id: string;
  nomor: string;
  totalBiaya: number;
  alokasi: HasilAlokasiBatch;
}

/**
 * Buat Output baru (Step 2): validasi → hitung biaya dari Proses terkait + kemasan
 * → hitung alokasi HPP → kurangi stok kemasan → tambah stok produk jadi.
 */
export async function buatOutput(input: BuatOutputInput): Promise<BuatOutputHasil> {
  if (input.prosesIds.length === 0) {
    throw new ProduksiValidationError("Minimal 1 proses harus dipilih.");
  }
  if (input.output.length === 0) {
    throw new ProduksiValidationError("Minimal 1 output produk jadi harus diisi.");
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
    const kemasanIds = [...new Set(input.kemasan.map((k) => k.kemasanId))];
    const produkJadiIds = [...new Set(input.output.map((o) => o.produkJadiId))];

    // 1) Ambil data Proses yang dipilih — harus SELESAI
    const prosesList = await tx.proses.findMany({
      where: { id: { in: input.prosesIds } },
      include: {
        bahanBaku: true,
      },
    });

    if (prosesList.length !== input.prosesIds.length) {
      throw new ProduksiValidationError("Ada proses yang tidak ditemukan.");
    }

    for (const p of prosesList) {
      if (p.status !== "SELESAI") {
        throw new ProduksiValidationError(
          `Proses ${p.nomor} (${p.nama ?? "-"}) belum SELESAI. Hanya proses yang sudah selesai yang bisa dijadikan output.`
        );
      }
      if (p.outletId !== input.outletId) {
        throw new ProduksiValidationError(
          `Proses ${p.nomor} bukan milik outlet yang sama. Semua proses harus dari outlet yang sama.`
        );
      }
    }

    // 2) Hitung total biaya dari semua Proses terkait
    let totalBiayaProses = 0;
    for (const p of prosesList) {
      for (const bb of p.bahanBaku) {
        totalBiayaProses += (Number(bb.qtyPakai) + Number(bb.qtyWaste)) * Number(bb.hargaSatuanSaatItu);
      }
    }

    // 3) Ambil data kemasan & produk jadi
    const [kemasanList, produkJadiList] = await Promise.all([
      kemasanIds.length > 0 ? tx.kemasan.findMany({ where: { id: { in: kemasanIds } } }) : Promise.resolve([] as any[]),
      tx.produkJadi.findMany({ where: { id: { in: produkJadiIds } }, include: { kemasan: true } }),
    ]);

    const kemasanMap = new Map(kemasanList.map((k) => [k.id, k]));

    // Auto-generate kemasan from ProdukJadi-Kemasan link
    for (const pj of produkJadiList) {
      if (pj.kemasanId && pj.kemasan) {
        const outputLine = input.output.find(o => o.produkJadiId === pj.id);
        if (outputLine) {
          const alreadyInList = input.kemasan.some(k => k.kemasanId === pj.kemasanId);
          if (!alreadyInList) {
            const lastPurchase = await tx.pembelianItem.findFirst({
              where: { kemasanId: pj.kemasanId! },
              orderBy: { pembelian: { tanggal: "desc" } },
              select: { hargaSatuan: true },
            });
            const hargaSatuan = lastPurchase ? Number(lastPurchase.hargaSatuan) : 0;
            const qtyPakai = outputLine.qty * Number(pj.qtyKemasanPerUnit ?? 1);
            input.kemasan.push({
              kemasanId: pj.kemasanId!,
              qtyPakai,
              hargaSatuanSaatItu: hargaSatuan,
            });
            const existingKemasan = kemasanList.find(k => k.id === pj.kemasanId);
            if (!existingKemasan) {
              const kData = await tx.kemasan.findUnique({ where: { id: pj.kemasanId! } });
              if (kData) {
                kemasanList.push(kData);
                kemasanMap.set(kData.id, kData);
              }
            }
          }
        }
      }
    }
    const produkJadiMap = new Map(produkJadiList.map((p) => [p.id, p]));

    // 4) Validasi stok kemasan
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

    // 5) Hitung alokasi HPP — biaya bahan baku dari proses + biaya kemasan
    // Representasikan biaya proses sebagai 1 baris "bahan baku virtual"
    const alokasi = hitungAlokasiHPP(
      [{ bahanBakuId: "__proses__", qtyPakai: 1, qtyWaste: 0, hargaSatuanSaatItu: totalBiayaProses }],
      input.kemasan,
      input.output.map((o) => ({
        produkJadiId: o.produkJadiId,
        qty: o.qty,
        beratBersih: produkJadiMap.get(o.produkJadiId)?.beratBersih ?? null,
      })),
      input.biayaLain ?? []
    );

    const nomor = buatNomorDokumen("OUT");

    // 6) Buat Output
    const output = await tx.output.create({
      data: {
        nomor,
        outletId: input.outletId,
        userId: input.userId,
        catatan: input.catatan || null,
        totalBiaya: alokasi.totalBiayaBatch,
      },
    });

    // 7) Junction: Output ↔ Proses
    for (const prosesId of input.prosesIds) {
      await tx.outputProses.create({
        data: { outputId: output.id, prosesId },
      });
    }

    // 8) Baris Kemasan — kurangi stok, catat pergerakan OUT
    for (const line of input.kemasan) {
      await tx.outputKemasan.create({
        data: {
          outputId: output.id,
          kemasanId: line.kemasanId,
          qtyPakai: line.qtyPakai,
          hargaSatuanSaatItu: line.hargaSatuanSaatItu!,
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
          referensiId: output.id,
          keterangan: `Output ${nomor}: pakai produksi`,
        },
      });
    }

    // 9) Baris Output — tambah stok produk jadi, simpan hppAlokasi, catat pergerakan IN
    for (const line of alokasi.output) {
      await tx.outputProdukJadi.create({
        data: {
          outputId: output.id,
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
          referensiId: output.id,
          keterangan: `Output ${nomor}: hasil produksi`,
        },
      });
    }

    return {
      id: output.id,
      nomor: output.nomor,
      totalBiaya: alokasi.totalBiayaBatch,
      alokasi,
    };
  });
}
