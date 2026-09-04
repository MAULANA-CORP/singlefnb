"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";

interface Baris {
  id: string;
  sumber: "POS" | "B2B";
  nomor: string;
  outlet: string;
  pihakNama: string;
  totalTagihan: number;
  totalTerbayar: number;
  sisa: number;
  jatuhTempo: string;
  status: "LUNAS" | "PARSIAL" | "BELUM_BAYAR";
  hariOverdue: number;
  overdue30: boolean;
}

export function LaporanPiutangClient() {
  const [filterOverdue, setFilterOverdue] = React.useState<string>("ALL");
  const [data, setData] = React.useState<{ baris: Baris[]; totalSisa: number; jumlahOverdue30: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(
    async (opts?: { forExport?: boolean }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterOverdue === "OVERDUE_30") params.set("hanyaOverdue", "1");
        if (opts?.forExport) params.set("export", "1");
        const res = await fetch(`/api/report/piutang-jatuh-tempo?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Laporan Piutang");
          return null;
        }
        setData(json);
        return json;
      } catch {
        toast.error("Tidak bisa terhubung ke server");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [filterOverdue]
  );

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOverdue]);

  async function handleExport() {
    const fresh = await load({ forExport: true });
    if (!fresh) return;
    exportRowsToExcel({
      modul: "piutang-jatuh-tempo",
      sheetName: "Piutang",
      columns: [
        { header: "Sumber", accessor: (r: Baris) => r.sumber, width: 8 },
        { header: "Nomor", accessor: (r: Baris) => r.nomor, width: 20 },
        { header: "Pihak", accessor: (r: Baris) => r.pihakNama, width: 22 },
        { header: "Outlet", accessor: (r: Baris) => r.outlet, width: 16 },
        { header: "Tagihan", accessor: (r: Baris) => r.totalTagihan, width: 16 },
        { header: "Terbayar", accessor: (r: Baris) => r.totalTerbayar, width: 16 },
        { header: "Sisa", accessor: (r: Baris) => r.sisa, width: 16 },
        { header: "Jatuh Tempo", accessor: (r: Baris) => formatTanggal(r.jatuhTempo), width: 14 },
        { header: "Hari Overdue", accessor: (r: Baris) => r.hariOverdue, width: 12 },
        { header: "Status", accessor: (r: Baris) => r.status, width: 14 },
      ],
      rows: fresh.baris,
    });
    toast.success("File Excel Laporan Piutang diunduh");
  }

  return (
    <div>
      <PageHeader title="Piutang Jatuh Tempo" description="Semua piutang yang belum lunas, diurutkan dari yang paling mendesak." />

      {loading || !data ? (
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard label="Total Sisa Piutang" value={formatRupiah(data.totalSisa)} />
            <StatCard label="Overdue > 30 hari" value={String(data.jumlahOverdue30)} tone={data.jumlahOverdue30 > 0 ? "danger" : "default"} icon={AlertTriangle} />
          </div>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <Select value={filterOverdue} onValueChange={setFilterOverdue}>
                <SelectTrigger className="w-full sm:w-[250px] bg-white dark:bg-zinc-900">
                  <SelectValue placeholder="Semua Piutang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Piutang</SelectItem>
                  <SelectItem value="OVERDUE_30">Overdue &gt; 30 Hari</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={data.baris.length === 0}>
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>

            {data.baris.length === 0 ? (
              <EmptyState title="Tidak ada piutang untuk ditampilkan" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                      <th className="py-2 pr-3">Sumber</th>
                      <th className="py-2 pr-3">Nomor</th>
                      <th className="py-2 pr-3">Pihak</th>
                      <th className="py-2 pr-3 text-right">Sisa</th>
                      <th className="py-2 pr-3">Jatuh Tempo</th>
                      <th className="py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.baris.map((b) => (
                      <tr
                        key={b.id}
                        className={cn(
                          "border-b border-gray-100 last:border-0 dark:border-zinc-800",
                          b.overdue30 && "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
                        )}
                      >
                        <td className="py-2 pr-3">
                          <Badge tone={b.sumber === "POS" ? "blue" : "green"}>{b.sumber}</Badge>
                        </td>
                        <td className="py-2 pr-3">{b.nomor}</td>
                        <td className="py-2 pr-3">{b.pihakNama}</td>
                        <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{formatRupiah(b.sisa)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatTanggal(b.jatuhTempo)}
                          {b.hariOverdue > 0 && (
                            <span className={cn("ml-2 text-xs", b.overdue30 ? "font-semibold text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                              Terlambat {b.hariOverdue} hari
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
