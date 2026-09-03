export interface OrderB2BItemDTO {
  id: string;
  produkJadiId: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
  produkJadi?: { id: string; nama: string; satuan: string; harga: number; stok: number };
}

export interface PembayaranDTO {
  id: string;
  jumlah: number;
  tanggal: string;
  catatan: string | null;
}

export interface PiutangDTO {
  id: string;
  totalTagihan: number;
  totalTerbayar: number;
  jatuhTempo: string;
  status: "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
  pembayaran?: PembayaranDTO[];
}

export interface InvoiceDTO {
  id: string;
  nomorInvoice: string;
  tanggalTerbit: string;
}

export interface SuratJalanDTO {
  id: string;
  noResi: string;
  tanggalKirim: string;
}

export interface OrderB2BDTO {
  id: string;
  nomor: string;
  agenId: string;
  outletId: string;
  userId: string;
  status: "DRAFT" | "INVOICE" | "DIKIRIM" | "PARSIAL" | "LUNAS" | "BATAL";
  metodeBayar: "CASH" | "TRANSFER_QRIS" | "KREDIT";
  statusBayar: "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
  tanggalJatuhTempo: string | null;
  subtotal: number;
  total: number;
  catatan: string | null;
  createdAt: string;
  updatedAt: string;
  agen: { id: string; nama: string; kontak: string | null; alamat: string | null };
  outlet: { id: string; nama: string };
  user?: { id: string; nama: string };
  items: OrderB2BItemDTO[];
  invoice: InvoiceDTO | null;
  suratJalan: SuratJalanDTO | null;
  piutang: PiutangDTO | null;
}
