// Tipe & helper kecil yang dipakai bareng oleh halaman-halaman modul POS.
// (bukan route file — aman ditaruh di dalam folder app router)

export interface OrderPOSListItem {
  id: string;
  nomor: string;
  customerId: string;
  outletId: string;
  userId: string;
  metodeBayar: "CASH" | "TRANSFER_QRIS" | "KREDIT";
  statusBayar: "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
  tanggalJatuhTempo: string | null;
  subtotal: number;
  total: number;
  catatan: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; nama: string; kontak: string | null } | null;
  outlet: { id: string; nama: string } | null;
  user: { id: string; nama: string } | null;
  items: Array<{
    id: string;
    produkJadiId: string;
    namaProduk: string;
    satuan: string;
    qty: number;
    hargaSatuan: number;
    subtotal: number;
  }>;
  piutang: {
    id: string;
    totalTagihan: number;
    totalTerbayar: number;
    jatuhTempo: string;
    status: "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
  } | null;
}

export const METODE_BAYAR_LABEL: Record<string, string> = {
  CASH: "Cash",
  TRANSFER_QRIS: "Transfer/QRIS",
  KREDIT: "Kredit",
};

export const METODE_BAYAR_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER_QRIS", label: "Transfer/QRIS" },
  { value: "KREDIT", label: "Kredit" },
];

export const STATUS_BAYAR_OPTIONS = [
  { value: "LUNAS", label: "Lunas" },
  { value: "PARSIAL", label: "Parsial" },
  { value: "BELUM_BAYAR", label: "Belum Bayar" },
];

export const KREDIT_TIPE_OPTIONS = [
  { value: "LANGSUNG_LUNAS", label: "Langsung Lunas" },
  { value: "PARSIAL", label: "Parsial (cicil)" },
];
