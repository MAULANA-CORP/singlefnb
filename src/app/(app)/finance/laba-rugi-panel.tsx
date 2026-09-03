"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";
import { PeriodOutletFilter, EXPORT_HINT } from "./period-outlet-filter";
import { firstOfMonthStr, todayStr, type LabaRugiResult, type OutletOption } from "./_lib";

export function LabaRugiPanel({ outlets }: { outlets: OutletOption[] }) {
  const [start, setStart] = React.useState(firstOfMonthStr());
  const [end, setEnd] = React.useState(todayStr());
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [data, setData] = React.useState<LabaRugiResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(
    async (opts?: { forExport?: boolean }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ start, end });
        if (outletId) params.set("outletId", outletId);
        if (opts?.forExport) params.set("export", "1");
        const res = await fetch(`/api/finance/laba-rugi?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Laba Rugi");
          return null;
        }
        setData(json);
        return json as LabaRugiResult;
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
    // Selalu panggil ulang dengan export=1 supaya tercatat di Audit Log, meski data sudah tampil.
    const fresh = await load({ forExport: true });
    if (!fresh) return;
    exportRowsToExcel({
      modul: "laba-rugi",
      sheetName: "Laba Rugi",
      columns: [
        { header: "Komponen", accessor: (r: { label: string; nilai: number }) => r.label, width: 32 },
        { header: "Nilai (Rp)", accessor: (r: { label: string; nilai: number }) => r.nilai, width: 20 },
      ],
      rows: [
        { label: "Total Penjualan POS", nilai: fresh.totalPenjualanPOS },
        { label: "Total Penjualan B2B", nilai: fresh.totalPenjualanB2B },
        { label: "Total Penjualan", nilai: fresh.totalPenjualan },
        { label: "HPP (Harga Pokok Penjualan)", nilai: -fresh.hpp },
        { label: "Laba Kotor", nilai: fresh.labaKotor },
        { label: "Beban Operasional", nilai: -fresh.bebanOperasional },
        { label: "Laba Bersih", nilai: fresh.labaBersih },
      ],
    });
    toast.success("File Excel Laba Rugi diunduh");
  }

  return (
    <div>
      <PeriodOutletFilter
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        outletId={outletId}
        onOutletChange={setOutletId}
        outlets={outlets}
      />

      {loading || !data ? (
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total Penjualan" value={formatRupiah(data.totalPenjualan)} icon={TrendingUp} />
            <StatCard label="HPP" value={formatRupiah(data.hpp)} tone="warning" />
            <StatCard
              label="Laba Bersih"
              value={formatRupiah(data.labaBersih)}
              tone={data.labaBersih >= 0 ? "success" : "danger"}
            />
          </div>

          {data.produkTanpaHpp.length > 0 && (
            <Card className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
              <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  {data.produkTanpaHpp.length} produk terjual pada periode ini belum pernah punya riwayat produksi,
                  HPP-nya dianggap Rp 0 (kurang akurat). Cek menu Proses Produksi.
                </p>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rincian Laba Rugi</CardTitle>
              <Button size="sm" variant="secondary" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </CardHeader>
            <div className="space-y-1 text-sm">
              <Baris label="Penjualan POS" nilai={data.totalPenjualanPOS} />
              <Baris label="Penjualan B2B" nilai={data.totalPenjualanB2B} />
              <Baris label="Total Penjualan" nilai={data.totalPenjualan} bold />
              <Baris label="HPP (Harga Pokok Penjualan)" nilai={-data.hpp} negatif />
              <Baris label="Laba Kotor" nilai={data.labaKotor} bold garis />
              <Baris label="Beban Operasional" nilai={-data.bebanOperasional} negatif />
              {data.bebanOperasionalPerKategori.map((k) => (
                <Baris key={k.kategori} label={`  · ${k.kategori}`} nilai={-k.total} negatif kecil />
              ))}
              <Baris label="Laba Bersih" nilai={data.labaBersih} bold garis besar />
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">{EXPORT_HINT}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function Baris({
  label,
  nilai,
  bold,
  negatif,
  garis,
  besar,
  kecil,
}: {
  label: string;
  nilai: number;
  bold?: boolean;
  negatif?: boolean;
  garis?: boolean;
  besar?: boolean;
  kecil?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${garis ? "border-t border-gray-200 dark:border-zinc-700 pt-2 mt-1" : ""}`}
    >
      <span className={`${bold ? "font-medium" : ""} ${kecil ? "text-xs text-gray-500 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
        {label}
      </span>
      <span
        className={`${besar ? "text-lg" : ""} ${bold ? "font-semibold" : ""} ${
          negatif ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-50"
        }`}
      >
        {formatRupiah(nilai)}
      </span>
    </div>
  );
}
