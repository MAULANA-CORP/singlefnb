"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";
import { PeriodOutletFilter, EXPORT_HINT } from "./period-outlet-filter";
import { firstOfMonthStr, todayStr, type ArusKasResult, type OutletOption } from "./_lib";

export function ArusKasPanel({ outlets }: { outlets: OutletOption[] }) {
  const [start, setStart] = React.useState(firstOfMonthStr());
  const [end, setEnd] = React.useState(todayStr());
  const [outletId, setOutletId] = React.useState<string | null>(outlets[0]?.id ?? null);
  const [data, setData] = React.useState<ArusKasResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(
    async (opts?: { forExport?: boolean }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ start, end });
        if (outletId) params.set("outletId", outletId);
        if (opts?.forExport) params.set("export", "1");
        const res = await fetch(`/api/finance/arus-kas?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Arus Kas");
          return null;
        }
        setData(json);
        return json as ArusKasResult;
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
      modul: "arus-kas",
      sheetName: "Arus Kas",
      columns: [
        { header: "Komponen", accessor: (r: { label: string; nilai: number }) => r.label, width: 32 },
        { header: "Nilai (Rp)", accessor: (r: { label: string; nilai: number }) => r.nilai, width: 20 },
      ],
      rows: [
        { label: "Penjualan Tunai (CASH/Transfer/QRIS)", nilai: fresh.masuk.penjualanTunai },
        { label: "Uang Muka Kredit Awal", nilai: fresh.masuk.dpKreditAwal },
        { label: "Cicilan Piutang Masuk", nilai: fresh.masuk.cicilanPiutang },
        { label: "Modal Masuk", nilai: fresh.masuk.modalMasuk },
        { label: "Total Kas Masuk", nilai: fresh.masuk.total },
        { label: "Pembelian Bahan Baku/Kemasan", nilai: -fresh.keluar.pembelian },
        { label: "Cicilan Utang Keluar", nilai: -fresh.keluar.cicilanUtang },
        { label: "Beban Operasional (Pengeluaran)", nilai: -fresh.keluar.pengeluaran },
        { label: "Prive", nilai: -fresh.keluar.prive },
        { label: "Total Kas Keluar", nilai: -fresh.keluar.total },
        { label: "Arus Kas Bersih", nilai: fresh.arusKasBersih },
      ],
    });
    toast.success("File Excel Arus Kas diunduh");
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
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Kas Masuk" value={formatRupiah(data.masuk.total)} icon={ArrowUpCircle} tone="success" />
            <StatCard label="Kas Keluar" value={formatRupiah(data.keluar.total)} icon={ArrowDownCircle} tone="danger" />
            <StatCard
              label="Arus Kas Bersih"
              value={formatRupiah(data.arusKasBersih)}
              icon={Wallet}
              tone={data.arusKasBersih >= 0 ? "success" : "danger"}
            />
          </div>

          {data.seriHarian.length > 1 && (
            <Card className="mb-4">
              <CardTitle className="mb-3">Tren Harian</CardTitle>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.seriHarian}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatTanggal(v)}
                      className="fill-gray-600 dark:fill-gray-400"
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatRupiah(v)} width={90} />
                    <Tooltip
                      formatter={(value) => formatRupiah(Number(value))}
                      labelFormatter={(v) => formatTanggal(String(v))}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="masuk" name="Kas Masuk" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="keluar" name="Kas Keluar" stroke="#dc2626" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="bersih" name="Bersih" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kas Masuk</CardTitle>
              </CardHeader>
              <div className="space-y-1 text-sm">
                <Baris label="Penjualan Tunai" nilai={data.masuk.penjualanTunai} />
                <Baris label="Uang Muka Kredit Awal" nilai={data.masuk.dpKreditAwal} />
                <Baris label="Cicilan Piutang Masuk" nilai={data.masuk.cicilanPiutang} />
                <Baris label="Modal Masuk" nilai={data.masuk.modalMasuk} />
                <Baris label="Total" nilai={data.masuk.total} bold garis />
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Kas Keluar</CardTitle>
              </CardHeader>
              <div className="space-y-1 text-sm">
                <Baris label="Pembelian Bahan Baku/Kemasan" nilai={data.keluar.pembelian} />
                <Baris label="Cicilan Utang Keluar" nilai={data.keluar.cicilanUtang} />
                <Baris label="Beban Operasional" nilai={data.keluar.pengeluaran} />
                <Baris label="Prive" nilai={data.keluar.prive} />
                <Baris label="Total" nilai={data.keluar.total} bold garis />
              </div>
            </Card>
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

function Baris({ label, nilai, bold, garis }: { label: string; nilai: number; bold?: boolean; garis?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${garis ? "border-t border-gray-200 dark:border-zinc-700 pt-2 mt-1" : ""}`}
    >
      <span className={`${bold ? "font-medium" : ""} text-gray-700 dark:text-gray-300`}>{label}</span>
      <span className={`${bold ? "font-semibold" : ""} text-gray-900 dark:text-gray-50`}>{formatRupiah(nilai)}</span>
    </div>
  );
}
