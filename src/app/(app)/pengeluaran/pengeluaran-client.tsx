"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";

interface Pengeluaran {
  id: string;
  outletId: string | null;
  namaOutlet: string | null;
  kategori: string;
  jumlah: number;
  tanggal: string;
  keterangan: string | null;
  namaUser: string;
}

interface OutletOption {
  id: string;
  nama: string;
}

function firstOfMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PengeluaranClient() {
  const [list, setList] = React.useState<Pengeluaran[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [outlets, setOutlets] = React.useState<OutletOption[]>([]);
  const [kategoriOptions, setKategoriOptions] = React.useState<string[]>([]);

  const [start, setStart] = React.useState(firstOfMonthStr());
  const [end, setEnd] = React.useState(todayStr());
  const [kategoriFilter, setKategoriFilter] = React.useState<string | null>(null);
  const [outletFilter, setOutletFilter] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Pengeluaran | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Pengeluaran | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [kategori, setKategori] = React.useState<string | null>(null);
  const [kategoriCustom, setKategoriCustom] = React.useState("");
  const [jumlah, setJumlah] = React.useState("");
  const [tanggal, setTanggal] = React.useState(todayStr());
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [keterangan, setKeterangan] = React.useState("");

  React.useEffect(() => {
    fetch("/api/finance/outlets")
      .then((r) => r.json())
      .then((d) => setOutlets(d.outlets ?? []))
      .catch(() => setOutlets([]));
    fetch("/api/pengeluaran/kategori")
      .then((r) => r.json())
      .then((d) => setKategoriOptions(d.kategori ?? []))
      .catch(() => setKategoriOptions([]));
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start, end });
      if (kategoriFilter) params.set("kategori", kategoriFilter);
      if (outletFilter) params.set("outletId", outletFilter);
      const res = await fetch(`/api/pengeluaran?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat data Pengeluaran");
        return;
      }
      setList(data.pengeluaran ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [start, end, kategoriFilter, outletFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setKategori(null);
    setKategoriCustom("");
    setJumlah("");
    setTanggal(todayStr());
    setOutletId(null);
    setKeterangan("");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(p: Pengeluaran) {
    setEditing(p);
    setKategori(p.kategori);
    setKategoriCustom("");
    setJumlah(String(p.jumlah));
    setTanggal(p.tanggal.slice(0, 10));
    setOutletId(p.outletId);
    setKeterangan(p.keterangan ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kategoriFinal = kategori === "__custom__" ? kategoriCustom.trim() : kategori;
    if (!kategoriFinal) {
      toast.error("Pilih atau isi kategori");
      return;
    }
    if (!(Number(jumlah) > 0)) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/pengeluaran/${editing.id}` : "/api/pengeluaran";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: kategoriFinal, jumlah: Number(jumlah), tanggal, outletId, keterangan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan Pengeluaran");
        return;
      }
      toast.success(editing ? "Pengeluaran diperbarui" : "Pengeluaran tercatat");
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pengeluaran/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menghapus");
        return;
      }
      toast.success("Pengeluaran dihapus");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    exportRowsToExcel({
      modul: "pengeluaran",
      sheetName: "Pengeluaran",
      columns: [
        { header: "Tanggal", accessor: (r: Pengeluaran) => formatTanggal(r.tanggal), width: 14 },
        { header: "Kategori", accessor: (r: Pengeluaran) => r.kategori, width: 18 },
        { header: "Jumlah", accessor: (r: Pengeluaran) => r.jumlah, width: 16 },
        { header: "Outlet", accessor: (r: Pengeluaran) => r.namaOutlet ?? "-", width: 16 },
        { header: "Keterangan", accessor: (r: Pengeluaran) => r.keterangan ?? "-", width: 30 },
        { header: "Dicatat oleh", accessor: (r: Pengeluaran) => r.namaUser, width: 16 },
      ],
      rows: list,
    });
    toast.success("File Excel Pengeluaran diunduh");
  }

  const kategoriDropdownOptions = [
    ...kategoriOptions.map((k) => ({ value: k, label: k })),
    { value: "__custom__", label: "Kategori lain (tulis manual)" },
  ];
  const outletOptions = [{ value: "", label: "Semua Outlet" }, ...outlets.map((o) => ({ value: o.id, label: o.nama }))];

  return (
    <div>
      <PageHeader
        title="Pengeluaran"
        description="Beban operasional (gaji, sewa, listrik, dll) — masuk ke Laba Rugi & Arus Kas."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Catat Pengeluaran
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Filter className="h-4 w-4" /> Filter
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Dari Tanggal" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Sampai Tanggal" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          <SearchableSelect
            label="Kategori"
            placeholder="Semua Kategori"
            options={[{ value: "", label: "Semua Kategori" }, ...kategoriOptions.map((k) => ({ value: k, label: k }))]}
            value={kategoriFilter}
            onChange={(v) => setKategoriFilter(v || null)}
          />
          <SearchableSelect
            label="Outlet"
            placeholder="Semua Outlet"
            options={outletOptions}
            value={outletFilter}
            onChange={(v) => setOutletFilter(v || null)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total periode ini: {formatRupiah(total)}</CardTitle>
          <Button size="sm" variant="secondary" onClick={handleExport} disabled={list.length === 0}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </CardHeader>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : list.length === 0 ? (
          <EmptyState
            title="Belum ada Pengeluaran"
            description="Catat beban operasional pertama untuk periode ini."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Catat Pengeluaran
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3 text-right">Jumlah</th>
                  <th className="py-2 pr-3">Outlet</th>
                  <th className="py-2 pr-3">Keterangan</th>
                  <th className="py-2 pr-3">Dicatat oleh</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatTanggal(p.tanggal)}</td>
                    <td className="py-2 pr-3">{p.kategori}</td>
                    <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{formatRupiah(p.jumlah)}</td>
                    <td className="py-2 pr-3">{p.namaOutlet ?? "-"}</td>
                    <td className="max-w-[220px] truncate py-2 pr-3">{p.keterangan ?? "-"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.namaUser}</td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Hapus"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Pengeluaran" : "Catat Pengeluaran"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect
            label="Kategori"
            required
            placeholder="Pilih kategori"
            options={kategoriDropdownOptions}
            value={kategori}
            onChange={setKategori}
          />
          {kategori === "__custom__" && (
            <Input
              label="Nama Kategori Baru"
              required
              value={kategoriCustom}
              onChange={(e) => setKategoriCustom(e.target.value)}
            />
          )}
          <Input label="Jumlah (Rp)" type="number" min={1} required value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
          <Input label="Tanggal" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          <SearchableSelect
            label="Outlet (opsional)"
            placeholder="Tidak spesifik outlet"
            options={outlets.map((o) => ({ value: o.id, label: o.nama }))}
            value={outletId}
            onChange={setOutletId}
          />
          <Textarea label="Keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Simpan Perubahan" : "Catat"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Pengeluaran?"
        description={
          deleteTarget ? `${deleteTarget.kategori} sebesar ${formatRupiah(deleteTarget.jumlah)} akan dihapus permanen.` : undefined
        }
        confirmLabel="Ya, Hapus"
        danger
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
