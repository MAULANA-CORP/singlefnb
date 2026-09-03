"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingSkeleton, EmptyState } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal, formatTanggalJam, hariOverdue } from "@/lib/utils";
import type { RiwayatPembayaranRow, StatusBayarValue } from "./types";

interface DetailBase {
  id: string;
  pihakNama: string;
  totalTagihan?: number; // Piutang
  totalUtang?: number; // Utang
  totalTerbayar: number;
  sisa: number;
  jatuhTempo: string;
  status: StatusBayarValue;
  riwayatPembayaran: RiwayatPembayaranRow[];
}

export function PembayaranDialog({
  open,
  onOpenChange,
  tipe,
  id,
  pihakNamaAwal,
  canBayar,
  onSukses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipe: "PIUTANG" | "UTANG";
  id: string | null;
  pihakNamaAwal?: string;
  canBayar: boolean;
  onSukses: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<DetailBase | null>(null);
  const [jumlah, setJumlah] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const baseUrl = tipe === "PIUTANG" ? "/api/piutang" : "/api/utang";

  const muatDetail = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/${id}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat detail");
        return;
      }
      setDetail(data.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, id]);

  React.useEffect(() => {
    if (open && id) {
      setJumlah("");
      setCatatan("");
      void muatDetail();
    } else if (!open) {
      setDetail(null);
    }
  }, [open, id, muatDetail]);

  async function handleBayar(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const nilai = Number(jumlah);
    if (!Number.isFinite(nilai) || nilai <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }
    if (detail && nilai > detail.sisa + 0.01) {
      toast.error(`Jumlah melebihi sisa tagihan (${formatRupiah(detail.sisa)})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/${id}/pembayaran`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah: nilai, catatan: catatan.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mencatat pembayaran");
        return;
      }
      toast.success(
        data.data.status === "LUNAS" ? "Pembayaran tercatat — status Lunas" : "Pembayaran tercatat"
      );
      setJumlah("");
      setCatatan("");
      await muatDetail();
      onSukses();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  const overdue = detail ? hariOverdue(detail.jatuhTempo) : 0;
  const isOverdue = detail ? detail.status !== "LUNAS" && overdue > 0 : false;
  const overdueParah = isOverdue && overdue > 30;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={tipe === "PIUTANG" ? "Detail Piutang" : "Detail Utang"}
      description={pihakNamaAwal ?? detail?.pihakNama}
    >
      {loading && <LoadingSkeleton rows={4} />}

      {!loading && detail && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-zinc-700">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total Tagihan</p>
              <p className="font-medium text-gray-900 dark:text-gray-50">
                {formatRupiah(detail.totalTagihan ?? detail.totalUtang)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Sudah Dibayar</p>
              <p className="font-medium text-gray-900 dark:text-gray-50">
                {formatRupiah(detail.totalTerbayar)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Sisa</p>
              <p className="font-semibold text-blue-600 dark:text-blue-400">
                {formatRupiah(detail.sisa)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Jatuh Tempo</p>
              <p className="font-medium text-gray-900 dark:text-gray-50">
                {formatTanggal(detail.jatuhTempo)}
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              {isOverdue && (
                <span
                  className={
                    overdueParah
                      ? "inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white"
                      : "inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300"
                  }
                >
                  Terlambat {overdue} hari
                </span>
              )}
            </div>
          </div>

          {canBayar && detail.status !== "LUNAS" && (
            <form onSubmit={handleBayar} className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-zinc-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Catat Pembayaran</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Jumlah Bayar"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  placeholder="0"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                />
                <Input
                  label="Catatan (opsional)"
                  placeholder="mis. transfer BCA"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>
              <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                Simpan Pembayaran
              </Button>
            </form>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              Riwayat Cicilan
            </p>
            {detail.riwayatPembayaran.length === 0 ? (
              <EmptyState title="Belum ada pembayaran" />
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-zinc-900 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tanggal</th>
                      <th className="px-3 py-2 font-medium">Jumlah</th>
                      <th className="px-3 py-2 font-medium">Catatan</th>
                      <th className="px-3 py-2 font-medium">Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                    {detail.riwayatPembayaran.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                          {formatTanggalJam(p.tanggal)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900 dark:text-gray-50">
                          {formatRupiah(p.jumlah)}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {p.catatan ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                          {p.dicatatOleh}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
