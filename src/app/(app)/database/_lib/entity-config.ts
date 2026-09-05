import { ENTITY_DEFS, type EntityFieldDef, type EntitySlug } from "@/lib/import-csv";
import type { Role } from "@/lib/session";

export interface EntityUiConfig {
  slug: EntitySlug;
  tabLabel: string;
  apiBase: string;
  fields: readonly EntityFieldDef[];
  /** Role yang boleh Tambah/Edit/Hapus/Import. Selain ini: hanya lihat. */
  writeRoles: Role[];
  /** Nama query param pencarian yang dipakai endpoint GET-nya. */
  searchParam: "search" | "q";
  /** Hint khusus per field (ditampilkan di bawah label form), keyed by field key. */
  fieldHints?: Partial<Record<string, string>>;
  emptyLabel: string;
}

const STOK_HINT = "Stok (isi untuk data awal, selanjutnya berubah otomatis dari transaksi)";

export const ENTITY_UI: EntityUiConfig[] = [
  {
    slug: "bahan-baku",
    tabLabel: "Bahan Baku",
    apiBase: "/api/database/bahan-baku",
    fields: ENTITY_DEFS["bahan-baku"].fields,
    writeRoles: ["OWNER"],
    searchParam: "search",
    fieldHints: {
      stok: STOK_HINT,
      hargaRataRata:
        "Harga beli per satuan (mis. Rp 35.000 per kg). Wajib diisi kalau ada stok lama, supaya HPP produksi tidak nol. Setelah ada pembelian baru, angka ini otomatis jadi rata-rata tertimbang.",
    },
    emptyLabel: "Belum ada data Bahan Baku",
  },
  {
    slug: "kemasan",
    tabLabel: "Kemasan",
    apiBase: "/api/database/kemasan",
    fields: ENTITY_DEFS.kemasan.fields,
    writeRoles: ["OWNER"],
    searchParam: "search",
    fieldHints: { stok: STOK_HINT },
    emptyLabel: "Belum ada data Kemasan",
  },
  {
    slug: "produk-jadi",
    tabLabel: "Produk Jadi",
    apiBase: "/api/database/produk-jadi",
    fields: ENTITY_DEFS["produk-jadi"].fields,
    writeRoles: ["OWNER"],
    searchParam: "search",
    fieldHints: {
      stok: STOK_HINT,
      beratBersih:
        "Isi berat/ukuran bersih dalam gram untuk produk yang dijual per ukuran (mis. \"Chili Oil 100gr\" → isi 100). Dipakai untuk alokasi HPP produksi multi-output secara proporsional per berat, bukan rata per botol. Boleh dikosongkan kalau tidak relevan.",
    },
    emptyLabel: "Belum ada data Produk Jadi",
  },
  {
    slug: "customers",
    tabLabel: "Customer",
    apiBase: "/api/database/customers",
    fields: ENTITY_DEFS.customers.fields,
    writeRoles: ["OWNER", "SALES"],
    searchParam: "search",
    emptyLabel: "Belum ada data Customer",
  },
  {
    slug: "agen",
    tabLabel: "Agen",
    apiBase: "/api/database/agen",
    fields: ENTITY_DEFS.agen.fields,
    writeRoles: ["OWNER", "SALES"],
    searchParam: "q",
    emptyLabel: "Belum ada data Agen",
  },
  {
    slug: "supplier",
    tabLabel: "Supplier",
    apiBase: "/api/database/supplier",
    fields: ENTITY_DEFS.supplier.fields,
    writeRoles: ["OWNER", "FINANCE"],
    searchParam: "q",
    emptyLabel: "Belum ada data Supplier",
  },
];
