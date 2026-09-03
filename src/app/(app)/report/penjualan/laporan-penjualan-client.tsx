"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";

interface Baris {
  id: string;
  jenis: "POS" | "B2B";
  nomor: string;
  tanggal: string;
  pihak: string;
  outlet: string;
  metodeBayar: string;
  statusBayar: string;
  total: number;
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

export function LaporanPenjualanClient() {
  const [start, setStart] = React.useState(firstOfMonthStr());
  const [end, setEnd] = React.useState(todayStr());
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [outlets, setOutlets] = React.useState<OutletOption[]>([]);
  const [data, setData] = React.useState<{ totalPOS: number; totalB2B: number; total: number; jumlahOrder: number; baris: Baris[] } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/finance/outlets")
      .then((r) => r.json())
      .then((d) => setOutlets(d.outlets ?? []))
      .catch(() => setOutlets([]));
  }, []);

  const load = React.useCallback(
    async (opts?: { forExport?: boolean }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ start, end });
        if (outletId) params.set("outletId", outletId);
        if (opts?.forExport) params.set("export", "1");
        const res = await fetch(`/api/report/penjualan?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Laporan Penjualan");
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
    [start, end, outletId]
  );

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, outletId]);

  async function handleExport() {
    const fresh = await load({ forExport: true });
    if (!fresh) return;
    exportRowsToExcel({
      modul: "laporan-penjualan",
      sheetName: "Penjualan",
      columns: [
        { header: "Tanggal", accessor: (r: Baris) => formatTanggal(r.tanggal), width: 14 },
        { header: "Jenis", accessor: (r: Baris) => r.jenis, width: 8 },
        { header: "Nomor", accessor: (r: Baris) => r.nomor, width: 20 },
        { header: "Pihak", accessor: (r: Baris) => r.pihak, width: 22 },
        { header: "Outlet", accessor: (r: Baris) => r.outlet, width: 16 },
        { header: "Metode Bayar", accessor: (r: Baris) => r.metodeBayar, width: 16 },
        { header: "Status Bayar", accessor: (r: Baris) => r.statusBayar, width: 14 },
        { header: "Total", accessor: (r: Baris) => r.total, width: 16 },
      ],
      rows: fresh.baris,
    });
    toast.success("File Excel Laporan Penjualan diunduh");
  }

  const outletOptions = [{ value: "", label: "Semua Outlet" }, ...outlets.map((o) => ({ value: o.id, label: o.nama }))];

  return (
    <div>
      <PageHeader title="Laporan Penjualan" description="Gabungan transaksi POS dan B2B per periode." />

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Filter className="h-4 w-4" /> Filter
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Dari Tanggal" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Sampai Tanggal" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          <SearchableSelect label="Outlet" placeholder="Semua Outlet" options={outletOptions} value={outletId} onChange={(v) => setOutletId(v || null)} />
        </div>
      </Card>

      {loading || !data ? (
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total POS" value={formatRupiah(data.totalPOS)} />
            <StatCard label="Total B2B" value={formatRupiah(data.totalB2B)} />
            <StatCard label="Total Keseluruhan" value={formatRupiah(data.total)} hint={`${data.jumlahOrder} order`} />
          </div>

          <Card>
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={data.baris.length === 0}>
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>
            {data.baris.length === 0 ? (
              <EmptyState title="Tidak ada transaksi pada periode ini" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                      <th className="py-2 pr-3">Tanggal</th>
                      <th className="py-2 pr-3">Jenis</th>
                      <th className="py-2 pr-3">Nomor</th>
                      <th className="py-2 pr-3">Pihak</th>
                      <th className="py-2 pr-3">Outlet</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.baris.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatTanggal(b.tanggal)}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={b.jenis === "POS" ? "blue" : "green"}>{b.jenis}</Badge>
                        </td>
                        <td className="py-2 pr-3">{b.nomor}</td>
                        <td className="py-2 pr-3">{b.pihak}</td>
                        <td className="py-2 pr-3">{b.outlet}</td>
                        <td className="py-2 pr-3">{b.statusBayar}</td>
                        <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{formatRupiah(b.total)}</td>
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
