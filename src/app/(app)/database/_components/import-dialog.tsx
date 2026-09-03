"use client";

import * as React from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, FileWarning, FileCheck2, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  classifyImportRows,
  mapCsvRowToFields,
  normalizeNama,
  type ClassifiedImportRow,
  type ImportSummary,
} from "@/lib/import-csv";
import type { EntityUiConfig } from "../_lib/entity-config";

interface ExistingItem {
  id: string;
  nama: string;
}

export function ImportDialog({
  open,
  onOpenChange,
  entity,
  existingItems,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: EntityUiConfig;
  existingItems: ExistingItem[];
  onImported: () => void;
}) {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [mappedRows, setMappedRows] = React.useState<Array<Record<string, unknown>> | null>(null);
  const [classified, setClassified] = React.useState<ClassifiedImportRow[] | null>(null);
  const [committing, setCommitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setMappedRows(null);
    setClassified(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped = result.data.map((row) => mapCsvRowToFields(row, entity.fields));
        const existingMap = new Map(existingItems.map((e) => [normalizeNama(e.nama), e.id]));
        const rows = classifyImportRows(mapped, entity.fields, existingMap);
        setMappedRows(mapped);
        setClassified(rows);
      },
      error: (err) => {
        toast.error(`Gagal membaca file CSV: ${err.message}`);
        reset();
      },
    });
  }

  async function commitImport() {
    if (!mappedRows || !mappedRows.length) return;
    setCommitting(true);
    try {
      const res = await fetch(`${entity.apiBase}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });
      const data = (await res.json()) as ImportSummary & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mengimpor data");
        return;
      }
      const errCount = data.errors?.length ?? 0;
      if (errCount > 0) {
        toast.warning(
          `Import selesai: ${data.created} baru, ${data.updated} update, ${errCount} baris gagal (lihat detail).`
        );
      } else {
        toast.success(`Import berhasil: ${data.created} baru, ${data.updated} diperbarui.`);
      }
      onImported();
      handleClose(false);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setCommitting(false);
    }
  }

  function downloadTemplate() {
    const headers = entity.fields.map((f) => f.label);
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${entity.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const created = classified?.filter((r) => r.action === "create").length ?? 0;
  const updated = classified?.filter((r) => r.action === "update").length ?? 0;
  const errorRows = classified?.filter((r) => r.action === "error") ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title={`Import CSV — ${entity.tabLabel}`}
      description="Pilih file .csv, periksa hasil pratinjau, baru klik Commit Import. Baris bermasalah tidak akan diimpor, tapi diperlihatkan di sini supaya bisa diperbaiki."
      className="sm:max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {fileName ? "Ganti File" : "Pilih File CSV"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
            Unduh Template CSV
          </Button>
          {fileName && (
            <span className="truncate text-sm text-gray-600 dark:text-gray-400">{fileName}</span>
          )}
        </div>

        {classified && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">
                <FileCheck2 className="mr-1 h-3.5 w-3.5" /> {created} baru
              </Badge>
              <Badge tone="blue">{updated} akan diperbarui</Badge>
              <Badge tone={errorRows.length ? "red" : "gray"}>
                <FileWarning className="mr-1 h-3.5 w-3.5" /> {errorRows.length} error
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                dari {classified.length} baris
              </span>
            </div>

            {updated > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" /> Terdapat {updated} nama duplikat (sudah ada di database). Baris ini akan menimpa/memperbarui data lama.
                </p>
              </div>
            )}

            {errorRows.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-red-800 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" /> Baris bermasalah (tidak akan diimpor)
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
                  {errorRows.map((r) => (
                    <div key={r.rowNumber} className="text-red-700 dark:text-red-300">
                      <span className="font-medium">Baris {r.rowNumber}:</span>{" "}
                      {r.errors.join("; ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                      Baris
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                      Nama
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classified.map((r) => (
                    <tr key={r.rowNumber} className="border-t border-gray-100 dark:border-zinc-800">
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{r.rowNumber}</td>
                      <td className="px-3 py-1.5">
                        {r.action === "create" && <Badge tone="green">Baru</Badge>}
                        {r.action === "update" && <Badge tone="blue">Update</Badge>}
                        {r.action === "error" && <Badge tone="red">Error</Badge>}
                      </td>
                      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-50">
                        {(r.data?.nama as string) ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-zinc-700">
          <Button type="button" variant="secondary" onClick={() => handleClose(false)}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={commitImport}
            loading={committing}
            disabled={!classified || created + updated === 0}
          >
            Commit Import{classified ? ` (${created + updated})` : ""}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
