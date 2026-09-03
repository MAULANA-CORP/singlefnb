// Helper export Excel (xlsx) untuk Finance/Pengeluaran/Report.
// Dipakai murni di client (tombol "Export Excel"), tidak menyentuh server.

import * as XLSX from "xlsx";
import { tanggalWIB } from "@/lib/utils";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  width?: number;
}

/**
 * Bikin & unduh file .xlsx dengan header bold, mengikuti pola nama file
 * `gampangin-fnb-<modul>-<YYYYMMDD>.xlsx`.
 */
export function exportRowsToExcel<T>(params: {
  modul: string; // dipakai di nama file, mis. "laba-rugi", "pengeluaran"
  sheetName?: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const { modul, sheetName = "Data", columns, rows } = params;

  const header = columns.map((c) => c.header);
  const body = rows.map((row) => columns.map((c) => c.accessor(row) ?? ""));

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Header bold — CATATAN: SheetJS Community Edition (paket "xlsx" di package.json ini)
  // tidak menjamin cell styling (font.bold) ikut ter-render di semua pembaca .xlsx;
  // ini best-effort (didukung sebagian pembaca/versi). Kalau butuh bold yang pasti
  // konsisten di semua Excel, perlu upgrade ke SheetJS Pro atau lib lain — di luar
  // scope v1 ini karena `xlsx` sudah ditentukan sebagai dependency yang dipakai.
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellRef];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }

  worksheet["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const filename = `gampangin-fnb-${modul}-${tanggalWIB().replace(/-/g, "")}.xlsx`;
  XLSX.writeFile(workbook, filename, { cellStyles: true });
  return filename;
}
