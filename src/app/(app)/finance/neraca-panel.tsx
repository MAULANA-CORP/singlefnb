"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Landmark, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";
import { AsOfOutletFilter, EXPORT_HINT } from "./period-outlet-filter";
import { todayStr, type NeracaResult, type OutletOption } from "./_lib";

export function NeracaPanel({ outlets }: { outlets: OutletOption[] }) {
  const [asOf, setAsOf] = React.useState(todayStr());
  const [outletId, setOutletId] = React.useState<string | null>(outlets[0]?.id ?? null);
  const [data, setData] = React.useState<NeracaResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(
    async (opts?: { forExport?: boolean }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ asOf });
        if (outletId) params.set("outletId", outletId);
        if (opts?.forExport) params.set("export", "1");
        const res = await fetch(`/api/finance/neraca?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Neraca");
          return null;
        }
        setData(json);
        return json as NeracaResult;
      } catch {
        toast.error("Tidak bisa terhubung ke server");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asOf, outletId]
  );

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf, outletId]);

  async function handleExport() {
    const fresh = await load({ forExport: true });
    if (!fresh) return;
    exportRowsToExcel({
      modul: "neraca",
      sheetName: "Neraca",
      columns: [
        { header: "Komponen", accessor: (r: { label: string; nilai: number }) => r.label, width: 32 },
        { header: "Nilai (Rp)", accessor: (r: { label: string; nilai: number }) => r.nilai, width: 20 },
      ],
      rows: [
        { label: "Kas", nilai: fresh.aset.kas },
        { label: "Piutang Belum Lunas", nilai: fresh.aset.piutangBelumLunas },
        { label: "Nilai Stok", nilai: fresh.aset.nilaiStok },
        { label: "Total Aset", nilai: fresh.aset.total },
        { label: "Utang Belum Lunas", nilai: fresh.kewajiban.utangBelumLunas },
        { label: "Total Kewajiban", nilai: fresh.kewajiban.total },
        { label: "Modal Awal + Penambahan", nilai: fresh.modal.modalAwalDanPenambahan },
        { label: "Prive", nilai: -fresh.modal.prive },
        { label: "Laba Ditahan Berjalan", nilai: fresh.modal.labaDitahanBerjalan },
        { label: "Total Modal", nilai: fresh.modal.total },
        { label: "Selisih (Aset - (Kewajiban + Modal))", nilai: fresh.selisih },
      ],
    });
    toast.success("File Excel Neraca diunduh");
  }

  const selisihSignifikan = data ? Math.abs(data.selisih) > 1 : false;

  return (
    <div>
      <AsOfOutletFilter
        asOf={asOf}
        onAsOfChange={setAsOf}
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
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total Aset" value={formatRupiah(data.aset.total)} icon={Landmark} />
            <StatCard label="Total Kewajiban" value={formatRupiah(data.kewajiban.total)} tone="warning" />
            <StatCard label="Total Modal" value={formatRupiah(data.modal.total)} tone="success" />
          </div>

          {selisihSignifikan && (
            <Card className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
              <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Ada selisih {formatRupiah(data.selisih)} antara Aset dan (Kewajiban + Modal). Seharusnya
                  berimbang secara konstruksi — kalau muncul, biasanya karena pembulatan Decimal kecil, atau ada
                  transaksi lampau di luar rentang data ini. Ditampilkan apa adanya, tidak disembunyikan.
                </p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Aset</CardTitle>
              </CardHeader>
              <div className="space-y-1 text-sm">
                <Baris label="Kas" nilai={data.aset.kas} />
                <Baris label="Piutang Belum Lunas" nilai={data.aset.piutangBelumLunas} />
                <Baris label="Nilai Stok" nilai={data.aset.nilaiStok} />
                <Baris label="Total Aset" nilai={data.aset.total} bold garis />
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kewajiban</CardTitle>
                </CardHeader>
                <div className="space-y-1 text-sm">
                  <Baris label="Utang Belum Lunas" nilai={data.kewajiban.utangBelumLunas} />
                  <Baris label="Total Kewajiban" nilai={data.kewajiban.total} bold garis />
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Modal</CardTitle>
                </CardHeader>
                <div className="space-y-1 text-sm">
                  <Baris label="Modal Awal + Penambahan" nilai={data.modal.modalAwalDanPenambahan} />
                  <Baris label="Prive" nilai={-data.modal.prive} negatif />
                  <Baris label="Laba Ditahan Berjalan" nilai={data.modal.labaDitahanBerjalan} />
                  <Baris label="Total Modal" nilai={data.modal.total} bold garis />
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
          <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-500">{EXPORT_HINT}</p>
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
}: {
  label: string;
  nilai: number;
  bold?: boolean;
  negatif?: boolean;
  garis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${garis ? "border-t border-gray-200 dark:border-zinc-700 pt-2 mt-1" : ""}`}
    >
      <span className={`${bold ? "font-medium" : ""} text-gray-700 dark:text-gray-300`}>{label}</span>
      <span
        className={`${bold ? "font-semibold" : ""} ${
          negatif ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-50"
        }`}
      >
        {formatRupiah(nilai)}
      </span>
    </div>
  );
}
