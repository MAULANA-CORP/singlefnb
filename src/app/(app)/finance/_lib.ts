// Tipe & helper kecil yang dipakai bareng oleh halaman-halaman modul Finance Room.
// (bukan route file — aman ditaruh di dalam folder app router, mengikuti pola modul POS)

export interface OutletOption {
  id: string;
  nama: string;
}

export interface ModalEntry {
  id: string;
  tipe: "MODAL_AWAL" | "PENAMBAHAN" | "PRIVE";
  sumberDana: "UANG_SENDIRI" | "PINJAMAN" | "INVESTOR" | null;
  jumlah: number;
  tanggal: string;
  keterangan: string | null;
  userId: string;
  namaUser: string;
  createdAt: string;
}

export const TIPE_MODAL_OPTIONS = [
  { value: "MODAL_AWAL", label: "Modal Awal" },
  { value: "PENAMBAHAN", label: "Penambahan Modal" },
  { value: "PRIVE", label: "Prive (Penarikan Pribadi)" },
];

export const TIPE_MODAL_LABEL: Record<string, string> = {
  MODAL_AWAL: "Modal Awal",
  PENAMBAHAN: "Penambahan Modal",
  PRIVE: "Prive",
};

export const SUMBER_DANA_OPTIONS = [
  { value: "UANG_SENDIRI", label: "Uang Sendiri" },
  { value: "PINJAMAN", label: "Pinjaman" },
  { value: "INVESTOR", label: "Investor" },
];

export const SUMBER_DANA_LABEL: Record<string, string> = {
  UANG_SENDIRI: "Uang Sendiri",
  PINJAMAN: "Pinjaman",
  INVESTOR: "Investor",
};

export interface LabaRugiResult {
  periode: { start: string; end: string };
  totalPenjualanPOS: number;
  totalPenjualanB2B: number;
  totalPenjualan: number;
  hpp: number;
  produkTanpaHpp: string[];
  labaKotor: number;
  bebanOperasional: number;
  bebanOperasionalPerKategori: Array<{ kategori: string; total: number }>;
  labaBersih: number;
}

export interface ArusKasResult {
  periode: { start: string; end: string };
  masuk: {
    penjualanTunai: number;
    dpKreditAwal: number;
    cicilanPiutang: number;
    modalMasuk: number;
    total: number;
  };
  keluar: {
    pembelian: number;
    cicilanUtang: number;
    pengeluaran: number;
    prive: number;
    total: number;
  };
  arusKasBersih: number;
  seriHarian: Array<{ tanggal: string; masuk: number; keluar: number; bersih: number }>;
}

export interface NeracaResult {
  asOf: string;
  aset: { kas: number; piutangBelumLunas: number; nilaiStok: number; total: number };
  kewajiban: { utangBelumLunas: number; total: number };
  modal: { modalAwalDanPenambahan: number; prive: number; labaDitahanBerjalan: number; total: number };
  selisih: number;
}

/** 'YYYY-MM-DD' hari ini (waktu browser) — dipakai default input tanggal. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' tanggal 1 bulan berjalan. */
export function firstOfMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
