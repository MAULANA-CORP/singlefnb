"use client";

import * as React from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingSkeleton, EmptyState } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal, hariOverdue, cn } from "@/lib/utils";
import { FilterBar } from "./filter-bar";
import { PembayaranDialog } from "./pembayaran-dialog";
import { FILTER_KOSONG, filterKeQuery } from "./types";
import type { FilterState, OutletOption, PiutangRow } from "./types";

export function PiutangTab({
  outlets,
  canBayar,
}: {
  outlets: OutletOption[];
  canBayar: boolean;
}) {
  const [filter, setFilter] = React.useState<FilterState>(FILTER_KOSONG);
  const [rows, setRows] = React.useState<PiutangRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedNama, setSelectedNama] = React.useState<string | undefined>(undefined);

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterKeQuery(filter);
      const res = await fetch(`/api/piutang${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat data piutang");
        return;
      }
      setRows(data.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void muat();
  }, [muat]);

  return (
    <div className="space-y-4">
      <FilterBar filter={filter} onChange={setFilter} outlets={outlets} pihakLabel="Customer / Agen" />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada piutang"
          description="Piutang muncul otomatis dari transaksi POS/B2B yang belum lunas."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-zinc-900 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">Customer / Agen</th>
                <th className="px-3 py-2.5 font-medium">Transaksi</th>
                <th className="px-3 py-2.5 font-medium">Outlet</th>
                <th className="px-3 py-2.5 font-medium">Total Tagihan</th>
                <th className="px-3 py-2.5 font-medium">Sisa</th>
                <th className="px-3 py-2.5 font-medium">Jatuh Tempo</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {rows.map((r) => {
                const overdue = r.status !== "LUNAS" ? hariOverdue(r.jatuhTempo) : 0;
                const isOverdue = overdue > 0;
                const overdueParah = isOverdue && overdue > 30;
                return (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setSelectedId(r.id);
                      setSelectedNama(r.pihakNama);
                    }}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800",
                      overdueParah
                        ? "border-l-4 border-l-red-600 bg-red-50/60 dark:bg-red-950/20"
                        : isOverdue && "border-l-4 border-l-amber-500"
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-50">
                      {r.pihakNama}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-400">
                      {r.sumber ? `${r.sumber} ${r.nomorTransaksi ?? ""}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-400">
                      {r.outletNama ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-900 dark:text-gray-50">
                      {formatRupiah(r.totalTagihan)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-blue-600 dark:text-blue-400">
                      {formatRupiah(r.sisa)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="text-gray-600 dark:text-gray-400">{formatTanggal(r.jatuhTempo)}</div>
                      {isOverdue && (
                        <div
                          className={cn(
                            "text-xs font-medium",
                            overdueParah ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          Terlambat {overdue} hari
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PembayaranDialog
        open={selectedId !== null}
        onOpenChange={(o) => !o && setSelectedId(null)}
        tipe="PIUTANG"
        id={selectedId}
        pihakNamaAwal={selectedNama}
        canBayar={canBayar}
        onSukses={() => void muat()}
      />
    </div>
  );
}
