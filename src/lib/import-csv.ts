// Helper bersama untuk modul Database: definisi field per entitas serta
// validasi/klasifikasi baris CSV (create/update/error). Dipakai oleh route API
// import (server, sumber kebenaran akhir) dan dialog preview import (client)
// supaya logikanya konsisten di kedua sisi.

import { SATUAN_OPTIONS } from "@/lib/satuan";

export type ImportFieldType = "text" | "number" | "select";

export interface EntityFieldDef {
  key: string;
  label: string;
  type: ImportFieldType;
  required?: boolean;
  /** Angka opsional (mis. stok) default ke 0 kalau kosong. Kalau false, hasilnya null. */
  optionalNumberDefaultsToZero?: boolean;
  /** Wajib bilangan bulat (dipakai untuk beratBersih dalam gram). */
  integer?: boolean;
  /** Ditampilkan dengan format Rupiah di tabel/preview. */
  money?: boolean;
  /** Opsi dropdown (type: "select"). CSV import tetap teks bebas yang harus cocok value-nya. */
  options?: readonly { value: string; label: string }[];
  /** Nilai awal form saat Tambah (bukan saat Edit). */
  defaultValue?: string;
}

export interface EntityDef {
  slug: string;
  label: string;
  fields: readonly EntityFieldDef[];
}

export const ENTITY_DEFS = {
  "bahan-baku": {
    slug: "bahan-baku",
    label: "Bahan Baku",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "satuan", label: "Satuan", type: "select", required: true, options: SATUAN_OPTIONS },
      { key: "stok", label: "Stok", type: "number", optionalNumberDefaultsToZero: true },
      {
        key: "hargaRataRata",
        label: "Harga Satuan",
        type: "number",
        optionalNumberDefaultsToZero: true,
        money: true,
      },
      { key: "stokMinimum", label: "ROP (Stok Min.)", type: "number", optionalNumberDefaultsToZero: true },
    ],
  },
  kemasan: {
    slug: "kemasan",
    label: "Kemasan",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "satuan", label: "Satuan", type: "select", required: true, options: SATUAN_OPTIONS },
      { key: "stok", label: "Stok", type: "number", optionalNumberDefaultsToZero: true },
      { key: "stokMinimum", label: "ROP (Stok Min.)", type: "number", optionalNumberDefaultsToZero: true },
    ],
  },
  "produk-jadi": {
    slug: "produk-jadi",
    label: "Produk Jadi",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "satuan", label: "Satuan", type: "select", required: true, options: SATUAN_OPTIONS, defaultValue: "pcs" },
      { key: "kemasanId", label: "Kemasan", type: "text" },
      { key: "qtyKemasanPerUnit", label: "Qty Kemasan/Unit", type: "number", optionalNumberDefaultsToZero: true },
      { key: "beratBersih", label: "Berat Bersih (gr)", type: "number", integer: true },
      { key: "harga", label: "Harga", type: "number", optionalNumberDefaultsToZero: true, money: true },
      { key: "stok", label: "Stok", type: "number", optionalNumberDefaultsToZero: true },
      { key: "stokMinimum", label: "ROP (Stok Min.)", type: "number", optionalNumberDefaultsToZero: true },
    ],
  },
  customers: {
    slug: "customers",
    label: "Customer",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "kontak", label: "Kontak", type: "text" },
      { key: "alamat", label: "Alamat", type: "text" },
    ],
  },
  agen: {
    slug: "agen",
    label: "Agen",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "kontak", label: "Kontak", type: "text" },
      { key: "alamat", label: "Alamat", type: "text" },
    ],
  },
  supplier: {
    slug: "supplier",
    label: "Supplier",
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "kontak", label: "Kontak", type: "text" },
      { key: "alamat", label: "Alamat", type: "text" },
    ],
  },
} as const satisfies Record<string, EntityDef>;

export type EntitySlug = keyof typeof ENTITY_DEFS;

/** "nama" dibandingkan case-insensitive & trim untuk deteksi duplikat/matching. */
export function normalizeNama(nama: string): string {
  return nama.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeHeader(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Ubah satu baris hasil parse CSV (keyed oleh header asli file) menjadi object
 * keyed oleh field key entitas, dengan mencocokkan header ke `key` atau `label`
 * field (case/spasi-insensitive). Header yang tidak dikenali diabaikan.
 */
export function mapCsvRowToFields(
  rawRow: Record<string, unknown>,
  fields: readonly EntityFieldDef[]
): Record<string, unknown> {
  const entries = Object.entries(rawRow).map(([k, v]) => [normalizeHeader(k), v] as const);
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    const keyNorm = normalizeHeader(f.key);
    const labelNorm = normalizeHeader(f.label);
    const match = entries.find(([k]) => k === keyNorm || k === labelNorm);
    result[f.key] = match ? match[1] : "";
  }
  return result;
}

export interface ClassifiedImportRow {
  rowNumber: number;
  action: "create" | "update" | "error";
  data: Record<string, unknown> | null;
  matchedId?: string;
  errors: string[];
}

/**
 * Validasi & klasifikasi baris (create/update/error) berdasarkan field def
 * entitas. `rows` sudah dalam bentuk keyed-by-field-key (lihat mapCsvRowToFields).
 * `existingNamaMap` = normalizeNama(nama) -> id, dari data yang sudah ada.
 * Baris invalid TIDAK di-skip diam-diam — selalu dikembalikan dengan action
 * "error" beserta pesan & nomor barisnya supaya bisa ditampilkan ke user.
 */
export function classifyImportRows(
  rows: Array<Record<string, unknown>>,
  fields: readonly EntityFieldDef[],
  existingNamaMap: Map<string, string>
): ClassifiedImportRow[] {
  const seenInFile = new Map<string, number>();

  return rows.map((row, idx) => {
    const rowNumber = idx + 2; // baris 1 = header
    const errors: string[] = [];
    const data: Record<string, unknown> = {};

    for (const f of fields) {
      const raw = row[f.key];
      const str = raw === undefined || raw === null ? "" : String(raw).trim();

      if (f.type === "text" || f.type === "select") {
        if (f.required && !str) {
          errors.push(`"${f.label}" wajib diisi`);
        } else {
          data[f.key] = str || null;
        }
        continue;
      }

      // type === "number"
      if (!str) {
        if (f.required) {
          errors.push(`"${f.label}" wajib diisi`);
        } else if (f.optionalNumberDefaultsToZero) {
          data[f.key] = 0;
        } else {
          data[f.key] = null;
        }
        continue;
      }

      const n = Number(str.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        errors.push(`"${f.label}" harus berupa angka >= 0 (dapat: "${str}")`);
        continue;
      }
      if (f.integer && !Number.isInteger(n)) {
        errors.push(`"${f.label}" harus bilangan bulat (dapat: "${str}")`);
        continue;
      }
      data[f.key] = n;
    }

    const namaRaw = String(data.nama ?? row.nama ?? "").trim();
    const normalized = normalizeNama(namaRaw);

    if (!errors.length) {
      if (!normalized) {
        errors.push(`"Nama" wajib diisi`);
      } else if (seenInFile.has(normalized)) {
        errors.push(`Nama duplikat dengan baris ${seenInFile.get(normalized)} di file ini`);
      } else {
        seenInFile.set(normalized, rowNumber);
      }
    }

    if (errors.length) {
      return { rowNumber, action: "error", data: null, errors };
    }

    const matchedId = existingNamaMap.get(normalized);
    return {
      rowNumber,
      action: matchedId ? "update" : "create",
      data,
      matchedId,
      errors: [],
    };
  });
}

/** Ringkasan hasil import — dipakai untuk response API & tampilan hasil di client. */
export interface ImportSummary {
  created: number;
  updated: number;
  errors: Array<{ rowNumber: number; errors: string[] }>;
}
