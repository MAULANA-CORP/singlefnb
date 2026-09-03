// Tipe data untuk halaman Catat Pembelian / Utang Baru.

export interface SupplierOption {
  id: string;
  nama: string;
  kontak: string | null;
  alamat: string | null;
}

export interface StokItemOption {
  id: string;
  nama: string;
  satuan: string;
}

export interface OutletOption {
  id: string;
  nama: string;
}

/** Satu baris item pembelian di form — belum dikirim ke server. */
export interface ItemPembelianForm {
  key: string; // key lokal untuk React list, bukan id DB
  jenis: "BAHAN_BAKU" | "KEMASAN" | ""; // dipilih dari SearchableSelect gabungan
  itemId: string;
  qty: string;
  hargaSatuan: string;
}

export function itemKosong(key: string): ItemPembelianForm {
  return { key, jenis: "", itemId: "", qty: "", hargaSatuan: "" };
}
