// Tipe data bersama untuk halaman Utang & Piutang (client-side, hasil serialisasi API).

export type StatusBayarValue = "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
export type SumberUtangValue = "PEMBELIAN" | "PINJAMAN" | "INVESTOR";

export interface OutletOption {
  id: string;
  nama: string;
}

export interface PiutangRow {
  id: string;
  pihakNama: string;
  totalTagihan: number;
  totalTerbayar: number;
  sisa: number;
  jatuhTempo: string;
  status: StatusBayarValue;
  sumber: "POS" | "B2B" | null;
  nomorTransaksi: string | null;
  outletNama: string | null;
  createdAt: string;
}

export interface UtangRow {
  id: string;
  sumber: SumberUtangValue;
  pihakNama: string;
  keterangan: string | null;
  totalUtang: number;
  totalTerbayar: number;
  sisa: number;
  jatuhTempo: string;
  status: StatusBayarValue;
  nomorPembelian: string | null;
  outletNama: string | null;
  createdAt: string;
}

export interface RiwayatPembayaranRow {
  id: string;
  jumlah: number;
  tanggal: string;
  catatan: string | null;
  dicatatOleh: string;
}

export interface FilterState {
  status: string; // "" = semua
  pihak: string;
  outletId: string;
  jatuhTempoDari: string;
  jatuhTempoSampai: string;
  tanggalDari: string;
  tanggalSampai: string;
}

export const FILTER_KOSONG: FilterState = {
  status: "",
  pihak: "",
  outletId: "",
  jatuhTempoDari: "",
  jatuhTempoSampai: "",
  tanggalDari: "",
  tanggalSampai: "",
};

export function filterKeQuery(f: FilterState, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (f.status) params.set("status", f.status);
  if (f.pihak) params.set("pihak", f.pihak);
  if (f.outletId) params.set("outletId", f.outletId);
  if (f.jatuhTempoDari) params.set("jatuhTempoDari", f.jatuhTempoDari);
  if (f.jatuhTempoSampai) params.set("jatuhTempoSampai", f.jatuhTempoSampai);
  if (f.tanggalDari) params.set("tanggalDari", f.tanggalDari);
  if (f.tanggalSampai) params.set("tanggalSampai", f.tanggalSampai);
  if (extra) for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  return params.toString();
}
