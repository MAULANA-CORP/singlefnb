// Satuan master data — dipakai dropdown Database (Bahan Baku / Kemasan / Produk Jadi).
// Value yang disimpan ke DB adalah kode singkat (kg, gr, pcs), bukan label panjang.

export interface SatuanOption {
  value: string;
  label: string;
}

export const SATUAN_OPTIONS: SatuanOption[] = [
  { value: "kg", label: "kg — Kilogram" },
  { value: "gr", label: "gr — Gram" },
  { value: "ons", label: "ons — Ons" },
  { value: "L", label: "L — Liter" },
  { value: "ml", label: "ml — Mililiter" },
  { value: "pcs", label: "pcs — Pcs" },
  { value: "buah", label: "buah" },
  { value: "botol", label: "botol" },
  { value: "ikat", label: "ikat" },
  { value: "bungkus", label: "bungkus" },
  { value: "sachet", label: "sachet" },
  { value: "pack", label: "pack" },
  { value: "dus", label: "dus" },
  { value: "lembar", label: "lembar" },
  { value: "roll", label: "roll" },
];

/** Kalau nilai lama tidak ada di daftar (data ketik bebas sebelumnya), tetap ditampilkan. */
export function satuanOptionsWithCurrent(current?: string | null): SatuanOption[] {
  const v = (current ?? "").trim();
  if (!v || SATUAN_OPTIONS.some((o) => o.value === v)) return SATUAN_OPTIONS;
  return [{ value: v, label: v }, ...SATUAN_OPTIONS];
}
