// Helper parsing rentang periode (query params) untuk route handler Finance/Report.
// Dipisah kecil supaya tidak diulang-ulang di tiap route.

import { tanggalWIB } from "@/lib/utils";

/** Awal hari (00:00:00.000 WIB) dari string 'YYYY-MM-DD'. null kalau kosong/invalid. */
export function parseTanggalAwal(nilai: string | null): Date | null {
  if (!nilai) return null;
  const d = new Date(nilai + "T00:00:00.000+07:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Akhir hari (23:59:59.999 WIB) dari string 'YYYY-MM-DD'. null kalau kosong/invalid. */
export function parseTanggalAkhir(nilai: string | null): Date | null {
  if (!nilai) return null;
  const d = new Date(nilai + "T23:59:59.999+07:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Titik waktu tunggal (dipakai untuk Neraca "as of"), akhir hari kalau hanya tanggal. */
export function parseTanggalTitik(nilai: string | null): Date | null {
  return parseTanggalAkhir(nilai);
}

/** Default awal periode: tanggal 1 bulan berjalan (00:00 WIB). */
export function awalBulanIni(): Date {
  const [yyyy, mm] = tanggalWIB().split("-");
  return new Date(`${yyyy}-${mm}-01T00:00:00.000+07:00`);
}

/** Default akhir periode: akhir hari ini (WIB). */
export function akhirHariIni(): Date {
  const [yyyy, mm, dd] = tanggalWIB().split("-");
  return new Date(`${yyyy}-${mm}-${dd}T23:59:59.999+07:00`);
}

/** Awal hari ini (00:00 WIB). */
export function awalHariIni(): Date {
  const [yyyy, mm, dd] = tanggalWIB().split("-");
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000+07:00`);
}
