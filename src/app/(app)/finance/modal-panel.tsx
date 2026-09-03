"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import {
  TIPE_MODAL_OPTIONS,
  TIPE_MODAL_LABEL,
  SUMBER_DANA_OPTIONS,
  SUMBER_DANA_LABEL,
  todayStr,
  type ModalEntry,
} from "./_lib";

const TIPE_BADGE_TONE: Record<string, "green" | "blue" | "red"> = {
  MODAL_AWAL: "blue",
  PENAMBAHAN: "green",
  PRIVE: "red",
};

export function ModalPanel() {
  const [entries, setEntries] = React.useState<ModalEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ModalEntry | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [tipe, setTipe] = React.useState<string | null>(null);
  const [sumberDana, setSumberDana] = React.useState<string | null>(null);
  const [jumlah, setJumlah] = React.useState("");
  const [tanggal, setTanggal] = React.useState(todayStr());
  const [keterangan, setKeterangan] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/modal");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat data Modal");
        return;
      }
      setEntries(data.modal ?? []);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setTipe(null);
    setSumberDana(null);
    setJumlah("");
    setTanggal(todayStr());
    setKeterangan("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipe) {
      toast.error("Pilih tipe modal");
      return;
    }
    if (!(Number(jumlah) > 0)) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    if (tipe === "PENAMBAHAN" && !sumberDana) {
      toast.error("Pilih sumber dana untuk Penambahan Modal");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/finance/modal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipe, sumberDana: tipe === "PENAMBAHAN" ? sumberDana : null, jumlah: Number(jumlah), tanggal, keterangan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan Modal");
        return;
      }
      toast.success("Entri Modal tersimpan");
      setDialogOpen(false);
      resetForm();
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
      const res = await fetch(`/api/finance/modal/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menghapus");
        return;
      }
      toast.success("Entri Modal dihapus");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setDeleting(false);
    }
  }

  const totalModalAwal = entries.filter((e) => e.tipe === "MODAL_AWAL").reduce((s, e) => s + e.jumlah, 0);
  const totalPenambahan = entries.filter((e) => e.tipe === "PENAMBAHAN").reduce((s, e) => s + e.jumlah, 0);
  const totalPrive = entries.filter((e) => e.tipe === "PRIVE").reduce((s, e) => s + e.jumlah, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Modal Awal</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(totalModalAwal)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Penambahan</p>
          <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">{formatRupiah(totalPenambahan)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Prive</p>
          <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">{formatRupiah(totalPrive)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Modal</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Entri
          </Button>
        </CardHeader>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Belum ada entri Modal"
            description="Catat Modal Awal, Penambahan Modal, atau Prive di sini."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Tambah Entri
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Tipe</th>
                  <th className="py-2 pr-3">Sumber Dana</th>
                  <th className="py-2 pr-3 text-right">Jumlah</th>
                  <th className="py-2 pr-3">Keterangan</th>
                  <th className="py-2 pr-3">Dicatat oleh</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatTanggal(entry.tanggal)}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={TIPE_BADGE_TONE[entry.tipe]}>{TIPE_MODAL_LABEL[entry.tipe]}</Badge>
                    </td>
                    <td className="py-2 pr-3">{entry.sumberDana ? SUMBER_DANA_LABEL[entry.sumberDana] : "-"}</td>
                    <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{formatRupiah(entry.jumlah)}</td>
                    <td className="py-2 pr-3 max-w-[220px] truncate">{entry.keterangan || "-"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{entry.namaUser}</td>
                    <td className="py-2 pr-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Tambah Entri Modal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect
            label="Tipe"
            required
            placeholder="Pilih tipe modal"
            options={TIPE_MODAL_OPTIONS}
            value={tipe}
            onChange={(v) => {
              setTipe(v);
              if (v !== "PENAMBAHAN") setSumberDana(null);
            }}
          />
          {tipe === "PENAMBAHAN" && (
            <SearchableSelect
              label="Sumber Dana"
              required
              placeholder="Pilih sumber dana"
              options={SUMBER_DANA_OPTIONS}
              value={sumberDana}
              onChange={setSumberDana}
            />
          )}
          <Input
            label="Jumlah (Rp)"
            type="number"
            min={1}
            required
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
          />
          <Input label="Tanggal" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          <Textarea label="Keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              <Wallet className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus entri Modal?"
        description={
          deleteTarget
            ? `${TIPE_MODAL_LABEL[deleteTarget.tipe]} sebesar ${formatRupiah(deleteTarget.jumlah)} akan dihapus permanen.`
            : undefined
        }
        confirmLabel="Ya, hapus"
        danger
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
