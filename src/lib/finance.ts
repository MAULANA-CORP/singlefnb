// Logika kalkulasi Finance Room — Laba Rugi, Arus Kas, Neraca, Nilai Stok.
// Dipisah dari route handler supaya mudah diuji & ditelusuri.
// Referensi: PRD §3.8, §3.9, §3.10, §7 "Business Logic Hardcoded" poin 1-4 & 6.
//
// PENTING — dua asumsi besar yang TIDAK sepenuhnya dirinci di PRD, didokumentasikan
// di sini (bukan pembukuan akuntansi formal / double-entry, sesuai catatan PRD §2 & §7.2):
//
// 1) COSTING PRODUK JADI (HPP per unit) — dipakai untuk HPP di Laba Rugi & Nilai Stok
//    di Neraca. `OutputProdukJadi.hppAlokasi` adalah HPP TOTAL per output produksi untuk
//    qty yang DIPRODUKSI, bukan yang TERJUAL. Karena tidak ada spek metode inventory
//    costing (FIFO/rata-rata berjalan) di PRD, dipakai pendekatan sederhana:
//    "rata-rata dari batch produksi TERAKHIR" per Produk Jadi — HPP per unit dihitung
//    dari (total hppAlokasi ÷ total qty) pada batch produksi paling baru untuk produk
//    itu, lalu dipakai sebagai HPP/unit untuk SEMUA unit terjual pada periode manapun.
//    Ini bukan FIFO/rata-rata bergerak yang akurat, tapi cukup untuk gambaran kesehatan
//    bisnis. Produk yang belum pernah diproduksi dianggap HPP = 0 dan ditandai di hasil.
//
// 2) EVENT KAS MASUK/KELUAR (Arus Kas) — karena tidak ada jurnal umum, "kas" didekati
//    dari event transaksi yang secara wajar berarti uang benar-benar berpindah:
//      (+) Setiap transaksi lunas seketika atau DP Kredit akan MENCIPTAKAN baris `Pembayaran`
//          (tipe PIUTANG) dan menganggap kas masuk sebesar jumlah yang dibayarkan.
//      (+) Setiap `Pembayaran` tipe PIUTANG → kas masuk sebesar jumlah, tanggal = tanggal
//          pembayaran.
//      (+) `Modal` tipe MODAL_AWAL / PENAMBAHAN → kas masuk.
//      (−) `Pembelian` (bahan baku/kemasan ke Supplier) → kas keluar sebesar total,
//          diasumsikan dibayar tunai saat pembelian dicatat (PRD tidak memisahkan
//          pembelian tunai vs kredit-ke-utang secara kas; Pembelian yang menghasilkan
//          Utang tetap dianggap kas keluar saat itu SESUAI RUMUS PRD §7.3, sementara
//          pelunasan Utang berikutnya via Pembayaran tipe UTANG below dihindarkan dari
//          dobel-hitung karena keduanya memang dua event kas yang berbeda secara wajar:
//          uang ke Supplier saat beli, dan uang ke pemberi pinjaman/investor saat cicil
//          Utang PINJAMAN/INVESTOR. Utang bersumber PEMBELIAN tidak dicicil lewat jalur
//          ini di v1 — kalau suatu saat Utang PEMBELIAN dicicil via Pembayaran tipe
//          UTANG juga, ada risiko dobel-hitung; diterima sebagai keterbatasan v1 dan
//          didokumentasikan, bukan dihitung ulang secara silang.)
//      (−) `Pembayaran` tipe UTANG → kas keluar sebesar jumlah, tanggal = tanggal bayar.
//      (−) `Pengeluaran` (beban operasional) → kas keluar sebesar jumlah, tanggal = tanggal.
//      (−) `Modal` tipe PRIVE → kas keluar.
//
// Kalau asumsi ini perlu diubah di kemudian hari, cukup ubah di satu tempat ini.

import { getPrisma } from "@/lib/prisma";

/** Tanggal paling awal yang dianggap "sejak awal berdirinya data" untuk saldo kumulatif. */
const EPOCH = new Date(0);

export interface PeriodeFilter {
  start: Date;
  end: Date;
  outletId?: string | null;
}

// ---------------------------------------------------------------------------
// HPP / Nilai Stok — helper bersama
// ---------------------------------------------------------------------------

export interface HppInfo {
  produkJadiId: string;
  hppPerUnit: number;
  diketahui: boolean; // false = belum pernah diproduksi, HPP dianggap 0 (perlu warning di UI)
}

/**
 * HPP per unit terbaru per Produk Jadi, dari batch produksi PALING BARU untuk
 * produk itu (lihat catatan asumsi #1 di atas). Produk tanpa riwayat produksi
 * dikembalikan dengan hppPerUnit=0, diketahui=false.
 */
export async function getLatestHppPerUnitMap(): Promise<Map<string, HppInfo>> {
  const prisma = getPrisma();
  const items = await prisma.outputProdukJadi.findMany({
    select: {
      produkJadiId: true,
      outputId: true,
      qty: true,
      hppAlokasi: true,
      output: { select: { tanggal: true, createdAt: true } },
    },
  });

  // Tentukan output TERAKHIR per produk (by tanggal output, lalu createdAt sbg tie-break)
  const latestOutput = new Map<string, { outputId: string; tanggal: Date; createdAt: Date }>();
  for (const o of items) {
    const cur = latestOutput.get(o.produkJadiId);
    const tanggal = o.output.tanggal;
    const createdAt = o.output.createdAt;
    if (
      !cur ||
      tanggal.getTime() > cur.tanggal.getTime() ||
      (tanggal.getTime() === cur.tanggal.getTime() && createdAt.getTime() > cur.createdAt.getTime())
    ) {
      latestOutput.set(o.produkJadiId, { outputId: o.outputId, tanggal, createdAt });
    }
  }

  const map = new Map<string, HppInfo>();
  for (const [produkJadiId, info] of latestOutput) {
    const relevan = items.filter(
      (o) => o.produkJadiId === produkJadiId && o.outputId === info.outputId
    );
    const totalQty = relevan.reduce((s, o) => s + Number(o.qty), 0);
    const totalHpp = relevan.reduce((s, o) => s + Number(o.hppAlokasi), 0);
    map.set(produkJadiId, {
      produkJadiId,
      hppPerUnit: totalQty > 0 ? totalHpp / totalQty : 0,
      diketahui: true,
    });
  }
  return map;
}

function hppFromMap(map: Map<string, HppInfo>, produkJadiId: string): number {
  return map.get(produkJadiId)?.hppPerUnit ?? 0;
}

/**
 * Biaya satuan terbaru untuk Bahan Baku / Kemasan — dipakai untuk Nilai Stok di Neraca.
 * Diambil dari observasi harga paling baru di antara dua sumber: `PembelianItem.hargaSatuan`
 //    (tanggal = tanggal pembelian) dan `ProsesBahanBaku.hargaSatuanSaatItu` /
 //    `OutputKemasan.hargaSatuanSaatItu`
 * (tanggal = tanggal batch produksi yang memakainya) — mana pun yang paling baru dipakai.
 */
async function getLatestUnitCostMap(kind: "bahanBaku" | "kemasan"): Promise<Map<string, number>> {
  const prisma = getPrisma();
  const observasi: Array<{ id: string; harga: number; tanggal: Date }> = [];

  if (kind === "bahanBaku") {
    const dariPembelian = await prisma.pembelianItem.findMany({
      where: { bahanBakuId: { not: null } },
      select: { bahanBakuId: true, hargaSatuan: true, pembelian: { select: { tanggal: true } } },
    });
    for (const it of dariPembelian) {
      observasi.push({ id: it.bahanBakuId as string, harga: Number(it.hargaSatuan), tanggal: it.pembelian.tanggal });
    }
    const dariProduksi = await prisma.prosesBahanBaku.findMany({
      select: { bahanBakuId: true, hargaSatuanSaatItu: true, proses: { select: { tanggal: true } } },
    });
    for (const it of dariProduksi) {
      observasi.push({ id: it.bahanBakuId, harga: Number(it.hargaSatuanSaatItu), tanggal: it.proses.tanggal });
    }
  } else {
    const dariPembelian = await prisma.pembelianItem.findMany({
      where: { kemasanId: { not: null } },
      select: { kemasanId: true, hargaSatuan: true, pembelian: { select: { tanggal: true } } },
    });
    for (const it of dariPembelian) {
      observasi.push({ id: it.kemasanId as string, harga: Number(it.hargaSatuan), tanggal: it.pembelian.tanggal });
    }
    const dariProduksi = await prisma.outputKemasan.findMany({
      select: { kemasanId: true, hargaSatuanSaatItu: true, output: { select: { tanggal: true } } },
    });
    for (const it of dariProduksi) {
      observasi.push({ id: it.kemasanId, harga: Number(it.hargaSatuanSaatItu), tanggal: it.output.tanggal });
    }
  }

  const terbaik = new Map<string, { harga: number; tanggal: Date }>();
  for (const o of observasi) {
    const cur = terbaik.get(o.id);
    if (!cur || o.tanggal.getTime() > cur.tanggal.getTime()) {
      terbaik.set(o.id, { harga: o.harga, tanggal: o.tanggal });
    }
  }
  const hasil = new Map<string, number>();
  for (const [id, v] of terbaik) hasil.set(id, v.harga);
  return hasil;
}

export interface NilaiStokItem {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  hargaSatuan: number;
  nilai: number;
  hargaDiketahui: boolean;
}

export interface NilaiStokResult {
  totalNilaiStok: number;
  nilaiBahanBaku: number;
  nilaiKemasan: number;
  nilaiProdukJadi: number;
  bahanBaku: NilaiStokItem[];
  kemasan: NilaiStokItem[];
  produkJadi: NilaiStokItem[];
}

/** Nilai stok saat ini atau pada tanggal tertentu (asOf). Dipakai di Neraca (Aset) & Laporan Stok. */
export async function hitungNilaiStok(asOf?: Date): Promise<NilaiStokResult> {
  const prisma = getPrisma();
  const [bahanBakuList, kemasanList, produkJadiList, bahanBakuCost, kemasanCost, hppMap] = await Promise.all([
    prisma.bahanBaku.findMany({ select: { id: true, nama: true, satuan: true, stok: true } }),
    prisma.kemasan.findMany({ select: { id: true, nama: true, satuan: true, stok: true } }),
    prisma.produkJadi.findMany({ select: { id: true, nama: true, satuan: true, stok: true } }),
    getLatestUnitCostMap("bahanBaku"),
    getLatestUnitCostMap("kemasan"),
    getLatestHppPerUnitMap(),
  ]);

  let bbMovement: any[] = [];
  let kemasanMovement: any[] = [];
  let pjMovement: any[] = [];

  if (asOf) {
    [bbMovement, kemasanMovement, pjMovement] = await Promise.all([
      prisma.stokMovementBahanBaku.groupBy({
        by: ["bahanBakuId", "tipe"],
        where: { tanggal: { lte: asOf } },
        _sum: { qty: true },
      }),
      prisma.stokMovementKemasan.groupBy({
        by: ["kemasanId", "tipe"],
        where: { tanggal: { lte: asOf } },
        _sum: { qty: true },
      }),
      prisma.stokMovementProdukJadi.groupBy({
        by: ["produkJadiId", "tipe"],
        where: { tanggal: { lte: asOf } },
        _sum: { qty: true },
      }),
    ]);
  }

  const getStok = (id: string, current: number, movements: any[], idField: string) => {
    if (!asOf) return current;
    let stok = 0;
    for (const m of movements) {
      if (m[idField] === id) {
        if (m.tipe === "IN") stok += Number(m._sum.qty);
        if (m.tipe === "OUT") stok -= Number(m._sum.qty);
      }
    }
    return stok;
  };

  const bahanBaku: NilaiStokItem[] = bahanBakuList.map((b) => {
    const harga = bahanBakuCost.get(b.id) ?? 0;
    const stok = getStok(b.id, Number(b.stok), bbMovement, "bahanBakuId");
    return {
      id: b.id,
      nama: b.nama,
      satuan: b.satuan,
      stok,
      hargaSatuan: harga,
      nilai: stok * harga,
      hargaDiketahui: bahanBakuCost.has(b.id),
    };
  });
  const kemasan: NilaiStokItem[] = kemasanList.map((k) => {
    const harga = kemasanCost.get(k.id) ?? 0;
    const stok = getStok(k.id, Number(k.stok), kemasanMovement, "kemasanId");
    return {
      id: k.id,
      nama: k.nama,
      satuan: k.satuan,
      stok,
      hargaSatuan: harga,
      nilai: stok * harga,
      hargaDiketahui: kemasanCost.has(k.id),
    };
  });
  const produkJadi: NilaiStokItem[] = produkJadiList.map((p) => {
    const info = hppMap.get(p.id);
    const harga = info?.hppPerUnit ?? 0;
    const stok = getStok(p.id, Number(p.stok), pjMovement, "produkJadiId");
    return {
      id: p.id,
      nama: p.nama,
      satuan: p.satuan,
      stok,
      hargaSatuan: harga,
      nilai: stok * harga,
      hargaDiketahui: info?.diketahui ?? false,
    };
  });

  const nilaiBahanBaku = bahanBaku.reduce((s, x) => s + x.nilai, 0);
  const nilaiKemasan = kemasan.reduce((s, x) => s + x.nilai, 0);
  const nilaiProdukJadi = produkJadi.reduce((s, x) => s + x.nilai, 0);

  return {
    totalNilaiStok: nilaiBahanBaku + nilaiKemasan + nilaiProdukJadi,
    nilaiBahanBaku,
    nilaiKemasan,
    nilaiProdukJadi,
    bahanBaku,
    kemasan,
    produkJadi,
  };
}

// ---------------------------------------------------------------------------
// LABA RUGI
// ---------------------------------------------------------------------------

export interface LabaRugiResult {
  periode: { start: string; end: string };
  totalPenjualanPOS: number;
  totalPenjualanB2B: number;
  totalPenjualan: number;
  hpp: number;
  produkTanpaHpp: string[]; // id Produk Jadi yang belum pernah diproduksi (HPP dianggap 0)
  labaKotor: number;
  bebanOperasional: number;
  bebanOperasionalPerKategori: Array<{ kategori: string; total: number }>;
  labaBersih: number;
}

/** Laba Rugi (P&L) untuk satu rentang periode. Rumus: PRD §7 poin 1. */
export async function hitungLabaRugi(filter: PeriodeFilter): Promise<LabaRugiResult> {
  const prisma = getPrisma();
  const { start, end, outletId } = filter;

  const [orderPOS, orderB2B, posItems, b2bItems, pengeluaran, hppMap] = await Promise.all([
    prisma.orderPOS.findMany({
      where: { createdAt: { gte: start, lte: end }, ...(outletId ? { outletId } : {}) },
      select: { total: true },
    }),
    prisma.orderB2B.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: "BATAL" },
        ...(outletId ? { outletId } : {}),
      },
      select: { total: true },
    }),
    prisma.orderPOSItem.findMany({
      where: {
        orderPOS: { createdAt: { gte: start, lte: end }, ...(outletId ? { outletId } : {}) },
      },
      select: { produkJadiId: true, qty: true, hppSatuanSaatItu: true },
    }),
    prisma.orderB2BItem.findMany({
      where: {
        orderB2B: {
          createdAt: { gte: start, lte: end },
          status: { not: "BATAL" },
          ...(outletId ? { outletId } : {}),
        },
      },
      select: { produkJadiId: true, qty: true, hppSatuanSaatItu: true },
    }),
    prisma.pengeluaran.findMany({
      where: {
        tanggal: { gte: start, lte: end },
        ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
      },
      select: { jumlah: true, kategori: true },
    }),
    getLatestHppPerUnitMap(),
  ]);

  const totalPenjualanPOS = orderPOS.reduce((s, o) => s + Number(o.total), 0);
  const totalPenjualanB2B = orderB2B.reduce((s, o) => s + Number(o.total), 0);

  const produkTanpaHppSet = new Set<string>();
  let hpp = 0;
  for (const it of [...posItems, ...b2bItems]) {
    if (it.hppSatuanSaatItu != null) {
      hpp += Number(it.qty) * Number(it.hppSatuanSaatItu);
    } else {
      const info = hppMap.get(it.produkJadiId);
      if (!info || !info.diketahui) produkTanpaHppSet.add(it.produkJadiId);
      hpp += Number(it.qty) * (info?.hppPerUnit ?? 0);
    }
  }

  const bebanOperasional = pengeluaran.reduce((s, p) => s + Number(p.jumlah), 0);
  const perKategoriMap = new Map<string, number>();
  for (const p of pengeluaran) {
    perKategoriMap.set(p.kategori, (perKategoriMap.get(p.kategori) ?? 0) + Number(p.jumlah));
  }

  const totalPenjualan = totalPenjualanPOS + totalPenjualanB2B;
  const labaKotor = totalPenjualan - hpp;
  const labaBersih = labaKotor - bebanOperasional;

  return {
    periode: { start: start.toISOString(), end: end.toISOString() },
    totalPenjualanPOS,
    totalPenjualanB2B,
    totalPenjualan,
    hpp,
    produkTanpaHpp: [...produkTanpaHppSet],
    labaKotor,
    bebanOperasional,
    bebanOperasionalPerKategori: [...perKategoriMap.entries()].map(([kategori, total]) => ({ kategori, total })),
    labaBersih,
  };
}

// ---------------------------------------------------------------------------
// ARUS KAS
// ---------------------------------------------------------------------------

export interface ArusKasResult {
  periode: { start: string; end: string };
  masuk: {
    penjualanTunai: number; // POS/B2B non-Kredit, lunas seketika
    dpKreditAwal: number; // uang muka order Kredit saat dibuat
    cicilanPiutang: number; // Pembayaran tipe PIUTANG
    modalMasuk: number; // Modal MODAL_AWAL + PENAMBAHAN
    total: number;
  };
  keluar: {
    pembelian: number;
    cicilanUtang: number; // Pembayaran tipe UTANG
    pengeluaran: number; // beban operasional
    prive: number;
    total: number;
  };
  arusKasBersih: number;
  /** Titik data harian untuk grafik (recharts) — hanya diisi kalau `sertakanSeri` true. */
  seriHarian?: Array<{ tanggal: string; masuk: number; keluar: number; bersih: number }>;
}

/** Arus Kas untuk satu rentang periode. Rumus & asumsi event kas: lihat komentar di atas file. */
export async function hitungArusKas(filter: PeriodeFilter): Promise<ArusKasResult> {
  const prisma = getPrisma();
  const { start, end, outletId } = filter;

  // Arus kas masuk sekarang terpusat dari tabel Pembayaran (PIUTANG).
  // orderPOSTunai dan orderB2BTunai tidak diquery lagi secara terpisah, karena
  // transaksi TUNAI (CASH/TRANSFER_QRIS) dan DP akan secara seragam menulis baris Pembayaran.
  const [pembayaranPiutang, modalList, pembelianList, cicilanUtang, pengeluaranList] =
    await Promise.all([
      prisma.pembayaran.findMany({
        where: {
          tipe: "PIUTANG",
          tanggal: { gte: start, lte: end },
          ...(outletId ? { piutang: { OR: [{ orderPOS: { outletId } }, { orderB2B: { outletId } }] } } : {}),
        },
        select: { jumlah: true },
      }),
      prisma.modal.findMany({
        where: { tanggal: { gte: start, lte: end } },
        select: { jumlah: true, tipe: true },
      }),
      prisma.pembelian.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
        },
        select: { total: true },
      }),
      prisma.pembayaran.findMany({
        where: {
          tipe: "UTANG",
          tanggal: { gte: start, lte: end },
          // Outlet filter omitted for Utang for now since Utang applies globally or via pembelian.
          // To be perfectly aligned, we should do utang: { pembelian: { outletId } } if outletId is provided.
        },
        select: { jumlah: true },
      }),
      prisma.pengeluaran.findMany({
        where: {
          tanggal: { gte: start, lte: end },
          ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
        },
        select: { jumlah: true },
      }),
    ]);

  const penjualanTunai = 0; // obsolete, now part of cicilanPiutang (pembayaran)
  const dpKreditAwal = 0; // obsolete, now part of cicilanPiutang (pembayaran)
  const cicilanPiutangTotal = pembayaranPiutang.reduce((s, p) => s + Number(p.jumlah), 0);
  const modalMasuk = modalList
    .filter((m) => m.tipe === "MODAL_AWAL" || m.tipe === "PENAMBAHAN")
    .reduce((s, m) => s + Number(m.jumlah), 0);
  const prive = modalList.filter((m) => m.tipe === "PRIVE").reduce((s, m) => s + Number(m.jumlah), 0);

  const pembelianTotal = pembelianList.reduce((s, p) => s + Number(p.total), 0);
  const cicilanUtangTotal = cicilanUtang.reduce((s, p) => s + Number(p.jumlah), 0);
  const pengeluaranTotal = pengeluaranList.reduce((s, p) => s + Number(p.jumlah), 0);

  const masukTotal = penjualanTunai + dpKreditAwal + cicilanPiutangTotal + modalMasuk;
  const keluarTotal = pembelianTotal + cicilanUtangTotal + pengeluaranTotal + prive;

  return {
    periode: { start: start.toISOString(), end: end.toISOString() },
    masuk: {
      penjualanTunai,
      dpKreditAwal,
      cicilanPiutang: cicilanPiutangTotal,
      modalMasuk,
      total: masukTotal,
    },
    keluar: {
      pembelian: pembelianTotal,
      cicilanUtang: cicilanUtangTotal,
      pengeluaran: pengeluaranTotal,
      prive,
      total: keluarTotal,
    },
    arusKasBersih: masukTotal - keluarTotal,
  };
}

/** Saldo kas kumulatif sejak awal data (epoch) sampai `asOf` — dipakai di Neraca. */
export async function hitungSaldoKasKumulatif(asOf: Date, outletId?: string | null): Promise<number> {
  const hasil = await hitungArusKas({ start: EPOCH, end: asOf, outletId });
  return hasil.arusKasBersih;
}

/**
 * Seri harian Arus Kas untuk grafik.
 * Dioptimasi dengan satu kueri besar per tabel, lalu diagregasi di memory, mengurangi ratusan kueri.
 */
export async function hitungSeriHarianArusKas(filter: PeriodeFilter): Promise<Array<{ tanggal: string; masuk: number; keluar: number; bersih: number }>> {
  const prisma = getPrisma();
  const { start, end, outletId } = filter;
  
  // Batasi rentang maksimum 92 hari di awal
  const maxEnd = new Date(start.getTime() + 92 * 24 * 60 * 60 * 1000);
  const actualEnd = end > maxEnd ? maxEnd : end;

  const [pembayaranPiutang, modalList, pembelianList, cicilanUtang, pengeluaranList] = await Promise.all([
    prisma.pembayaran.findMany({
      where: {
        tipe: "PIUTANG",
        tanggal: { gte: start, lte: actualEnd },
        ...(outletId ? { piutang: { OR: [{ orderPOS: { outletId } }, { orderB2B: { outletId } }] } } : {}),
      },
      select: { tanggal: true, jumlah: true },
    }),
    prisma.modal.findMany({
      where: { tanggal: { gte: start, lte: actualEnd } },
      select: { tanggal: true, jumlah: true, tipe: true },
    }),
    prisma.pembelian.findMany({
      where: {
        createdAt: { gte: start, lte: actualEnd },
        ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
      },
      select: { createdAt: true, total: true },
    }),
    prisma.pembayaran.findMany({
      where: {
        tipe: "UTANG",
        tanggal: { gte: start, lte: actualEnd },
      },
      select: { tanggal: true, jumlah: true },
    }),
    prisma.pengeluaran.findMany({
      where: {
        tanggal: { gte: start, lte: actualEnd },
        ...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {}),
      },
      select: { tanggal: true, jumlah: true },
    }),
  ]);

  const mapHarian = new Map<string, { masuk: number; keluar: number }>();

  const add = (tgl: Date, type: "masuk" | "keluar", val: number) => {
    const key = tgl.toISOString().slice(0, 10);
    const curr = mapHarian.get(key) ?? { masuk: 0, keluar: 0 };
    curr[type] += val;
    mapHarian.set(key, curr);
  };

  for (const p of pembayaranPiutang) add(p.tanggal, "masuk", Number(p.jumlah));
  for (const m of modalList) {
    if (m.tipe === "MODAL_AWAL" || m.tipe === "PENAMBAHAN") add(m.tanggal, "masuk", Number(m.jumlah));
    else if (m.tipe === "PRIVE") add(m.tanggal, "keluar", Number(m.jumlah));
  }
  for (const p of pembelianList) add(p.createdAt, "keluar", Number(p.total));
  for (const p of cicilanUtang) add(p.tanggal, "keluar", Number(p.jumlah));
  for (const p of pengeluaranList) add(p.tanggal, "keluar", Number(p.jumlah));

  const hasil: Array<{ tanggal: string; masuk: number; keluar: number; bersih: number }> = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const akhir = new Date(Date.UTC(actualEnd.getUTCFullYear(), actualEnd.getUTCMonth(), actualEnd.getUTCDate()));
  
  while (cursor.getTime() <= akhir.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    const val = mapHarian.get(key) ?? { masuk: 0, keluar: 0 };
    hasil.push({
      tanggal: key,
      masuk: val.masuk,
      keluar: val.keluar,
      bersih: val.masuk - val.keluar,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return hasil;
}

// ---------------------------------------------------------------------------
// NERACA
// ---------------------------------------------------------------------------

export interface NeracaResult {
  asOf: string;
  aset: {
    kas: number;
    piutangBelumLunas: number;
    nilaiStok: number;
    total: number;
  };
  kewajiban: {
    utangBelumLunas: number;
    total: number;
  };
  modal: {
    modalAwalDanPenambahan: number;
    prive: number;
    labaDitahanBerjalan: number;
    total: number;
  };
  selisih: number; // Aset - (Kewajiban + Modal), harusnya 0 secara konstruksi
}

/** Neraca (Balance Sheet) per tanggal tertentu. Rumus: PRD §7 poin 2. */
export async function hitungNeraca(asOf: Date, outletId?: string | null): Promise<NeracaResult> {
  const prisma = getPrisma();

  const [kas, piutangList, utangList, nilaiStok, modalList, labaRugiKumulatif] = await Promise.all([
    hitungSaldoKasKumulatif(asOf, outletId),
    prisma.piutang.findMany({ 
      where: { createdAt: { lte: asOf } }, 
      select: { totalTagihan: true, pembayaran: { where: { tanggal: { lte: asOf } }, select: { jumlah: true } } } 
    }),
    prisma.utang.findMany({
      where: { createdAt: { lte: asOf } },
      select: { totalUtang: true, sumber: true, pembelian: { select: { outletId: true } }, pembayaran: { where: { tanggal: { lte: asOf } }, select: { jumlah: true } } },
    }),
    hitungNilaiStok(asOf),
    prisma.modal.findMany({ where: { tanggal: { lte: asOf } }, select: { jumlah: true, tipe: true } }),
    hitungLabaRugi({ start: EPOCH, end: asOf, outletId }),
  ]);

  // Piutang/Utang dihitung historis berdasarkan asOf
  const piutangBelumLunas = piutangList.reduce((s, p) => {
    const terbayar = p.pembayaran.reduce((sum, pb) => sum + Number(pb.jumlah), 0);
    return s + (Number(p.totalTagihan) - terbayar);
  }, 0);

  const utangBelumLunas = utangList
    .filter((u) => {
      if (!outletId) return true;
      if (u.sumber !== "PEMBELIAN") return true; // Pinjaman/Investor dianggap company-wide
      return !u.pembelian?.outletId || u.pembelian.outletId === outletId;
    })
    .reduce((s, u) => {
      const terbayar = u.pembayaran.reduce((sum, pb) => sum + Number(pb.jumlah), 0);
      return s + (Number(u.totalUtang) - terbayar);
    }, 0);

  const asetTotal = kas + piutangBelumLunas + nilaiStok.totalNilaiStok;
  const kewajibanTotal = utangBelumLunas;

  const modalAwalDanPenambahan = modalList
    .filter((m) => m.tipe === "MODAL_AWAL" || m.tipe === "PENAMBAHAN")
    .reduce((s, m) => s + Number(m.jumlah), 0);
  const prive = modalList.filter((m) => m.tipe === "PRIVE").reduce((s, m) => s + Number(m.jumlah), 0);
  const modalTotal = modalAwalDanPenambahan - prive + labaRugiKumulatif.labaBersih;

  return {
    asOf: asOf.toISOString(),
    aset: { kas, piutangBelumLunas, nilaiStok: nilaiStok.totalNilaiStok, total: asetTotal },
    kewajiban: { utangBelumLunas, total: kewajibanTotal },
    modal: {
      modalAwalDanPenambahan,
      prive,
      labaDitahanBerjalan: labaRugiKumulatif.labaBersih,
      total: modalTotal,
    },
    selisih: asetTotal - (kewajibanTotal + modalTotal),
  };
}

export { EPOCH as FINANCE_EPOCH };
