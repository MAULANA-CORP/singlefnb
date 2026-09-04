"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/utils";
import type { Role } from "@/lib/session";
import type { EntityUiConfig } from "../_lib/entity-config";
import { ImportDialog } from "./import-dialog";

type Row = Record<string, unknown> & { id: string; nama: string };

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function EntityTab({ entity, role }: { entity: EntityUiConfig; role: Role }) {
  const canWrite = entity.writeRoles.includes(role);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = React.useState(1);

  const PAGE_SIZE = 20;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [formValues, setFormValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<Row | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [importOpen, setImportOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set(entity.searchParam, debouncedSearch.trim());
      const res = await fetch(`${entity.apiBase}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Gagal memuat data ${entity.tabLabel}`);
        return;
      }
      setRows((data.items ?? data.data ?? []) as Row[]);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, entity.apiBase, entity.searchParam, entity.tabLabel]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Reset page when search changes
  React.useEffect(() => { setPage(1); }, [debouncedSearch]);

  function openCreate() {
    setEditing(null);
    const initial: Record<string, string> = {};
    for (const f of entity.fields) initial[f.key] = "";
    setFormValues(initial);
    setFormOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const initial: Record<string, string> = {};
    for (const f of entity.fields) {
      const v = row[f.key];
      initial[f.key] = v === null || v === undefined ? "" : String(v);
    }
    setFormValues(initial);
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of entity.fields) {
        const raw = formValues[f.key] ?? "";
        if (f.type === "number") {
          body[f.key] = raw.trim() === "" ? (f.required ? 0 : null) : Number(raw);
        } else {
          body[f.key] = raw.trim();
        }
      }

      const url = editing ? `${entity.apiBase}/${editing.id}` : entity.apiBase;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan data");
        return;
      }

      const isDup = data.existing === true || data.duplikat === true;
      if (isDup) {
        toast.message("Nama sudah ada — memakai data yang sudah ada.");
      } else {
        toast.success(editing ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${entity.apiBase}/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menghapus data");
        return;
      }
      toast.success("Data berhasil dihapus");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setDeleting(false);
    }
  }

  const columns = entity.fields.filter((f) => f.key !== "nama");

  // Pagination
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginatedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={`Cari ${entity.tabLabel}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canWrite && (
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={entity.emptyLabel}
            description={
              canWrite
                ? "Tambah data manual atau import lewat CSV."
                : "Belum ada data untuk ditampilkan."
            }
            action={
              canWrite ? (
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Tambah {entity.tabLabel}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-700">
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                    Nama
                  </th>
                  {columns.map((f) => (
                    <th
                      key={f.key}
                      className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
                    >
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-50">
                      {row.nama}
                    </td>
                    {columns.map((f) => {
                      const v = row[f.key];
                      let display: React.ReactNode = "-";
                      if (v !== null && v !== undefined && v !== "") {
                        display = f.money
                          ? formatRupiah(Number(v))
                          : f.type === "number"
                          ? formatAngka(Number(v), f.key === "harga" ? 0 : undefined)
                          : String(v);
                      }
                      return (
                        <td key={f.key} className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                          {display}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {canWrite ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              aria-label={`Edit ${row.nama}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              aria-label={`Hapus ${row.nama}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Lihat saja</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={rows.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${entity.tabLabel}` : `Tambah ${entity.tabLabel}`}
      >
        <form onSubmit={submitForm} className="space-y-4">
          {entity.fields.map((f) => (
            <div key={f.key}>
              <Input
                label={f.label}
                required={f.required}
                type={f.type === "number" ? "number" : "text"}
                step={f.type === "number" ? (f.integer ? "1" : "0.001") : undefined}
                min={f.type === "number" ? "0" : undefined}
                autoFocus={f.key === "nama"}
                value={formValues[f.key] ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
              {entity.fieldHints?.[f.key] && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  {entity.fieldHints[f.key]}
                </p>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Simpan Perubahan" : "Tambah"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus ${deleteTarget?.nama ?? ""}?`}
        description="Tindakan ini tidak bisa dibatalkan. Data yang masih dipakai di transaksi lain tidak akan bisa dihapus."
        confirmLabel="Ya, Hapus"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity={entity}
        existingItems={rows}
        onImported={load}
      />
    </div>
  );
}
