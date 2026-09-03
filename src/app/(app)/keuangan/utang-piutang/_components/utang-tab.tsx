"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { LoadingSkeleton, EmptyState } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal, hariOverdue, cn } from "@/lib/utils";
import { FilterBar } from "./filter-bar";
import { PembayaranDialog } from "./pembayaran-dialog";
import { FILTER_KOSONG, filterKeQuery } from "./types";
import type { FilterState, OutletOption, UtangRow } from "./types";

const SUMBER_OPTIONS = [
  { value: "PEMBELIAN", label: "Pembelian" },
  { value: "PINJAMAN", label: "Pinjaman" },
  { value: "INVESTOR", label: "Investor" },
];

const SUMBER_LABEL: Record<string, string> = {
  PEMBELIAN: "Pembelian",
  PINJAMAN: "Pinjaman",
  INVESTOR: "Investor",
};

export function UtangTab({ outlets }: { outlets: OutletOption[] }) {
  const [filter, setFilter] = React.useState<FilterState>(FILTER_KOSONG);
  const [sumber, setSumber] = React.useState<string>("");
  const [rows, setRows] = React.useState<UtangRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedNama, setSelectedNama] = React.useState<string | undefined>(undefined);

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterKeQuery(filter, { sumber });
      const res = await fetch(`/api/utang${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat data utang");
        return;
      }
      setRows(data.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [filter, sumber]);

  React.useEffect(() => {
    void muat();
  }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FilterBar
          filter={filter}
          onChange={setFilter}
          outlets={outlets}
          pihakLabel="Supplier / Pemberi Pinjaman"
          extra={
            <SearchableSelect
              label="Sumber"
              placeholder="Semua sumber"
              options={SUMBER_OPTIONS}
              value={sumber || null}
              onChange={(v) => setSumber(v ?? "")}
            />
          }
        />
      </div>

      <div className="flex justify-end">
        <Link href="/keuangan/pembelian">
          <Button type="button" size="sm">
            <Plus className="h-4 w-4" />
            Catat Pembelian / Utang Baru
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada utang"
          description="Catat pembelian dari supplier, pinjaman, atau dana investor lewat tombol di atas."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-zinc-900 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">Pihak</th>
                <th className="px-3 py-2.5 font-medium">Sumber</th>
                <th className="px-3 py-2.5 font-medium">Outlet</th>
                <th className="px-3 py-2.5 font-medium">Total Utang</th>
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
                      {r.nomorPembelian && (
                        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                          {r.nomorPembelian}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge tone={r.sumber === "PEMBELIAN" ? "blue" : "gray"}>
                        {SUMBER_LABEL[r.sumber] ?? r.sumber}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-400">
                      {r.outletNama ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-900 dark:text-gray-50">
                      {formatRupiah(r.totalUtang)}
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
        tipe="UTANG"
        id={selectedId}
        pihakNamaAwal={selectedNama}
        canBayar
        onSukses={() => void muat()}
      />
    </div>
  );
}
