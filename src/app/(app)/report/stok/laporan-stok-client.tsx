"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka } from "@/lib/utils";
import { exportRowsToExcel } from "@/lib/export-excel";

interface NilaiStokItem {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  hargaSatuan: number;
  nilai: number;
  hargaDiketahui: boolean;
}
interface NilaiStokResult {
  totalNilaiStok: number;
  nilaiBahanBaku: number;
  nilaiKemasan: number;
  nilaiProdukJadi: number;
  bahanBaku: NilaiStokItem[];
  kemasan: NilaiStokItem[];
  produkJadi: NilaiStokItem[];
}

function Bagian({ title, items, modul }: { title: string; items: NilaiStokItem[]; modul: string }) {
  const adaFallback = items.some((i) => !i.hargaDiketahui && i.stok > 0);

  function handleExport() {
    exportRowsToExcel({
      modul,
      sheetName: title,
      columns: [
        { header: "Nama", accessor: (r: NilaiStokItem) => r.nama, width: 24 },
        { header: "Satuan", accessor: (r: NilaiStokItem) => r.satuan, width: 10 },
        { header: "Stok", accessor: (r: NilaiStokItem) => r.stok, width: 12 },
        { header: "Harga Satuan", accessor: (r: NilaiStokItem) => r.hargaSatuan, width: 16 },
        { header: "Nilai", accessor: (r: NilaiStokItem) => r.nilai, width: 16 },
      ],
      rows: items,
    });
    toast.success(`File Excel ${title} diunduh`);
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Button size="sm" variant="secondary" onClick={handleExport} disabled={items.length === 0}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </CardHeader>
      {adaFallback && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Sebagian item belum punya riwayat harga (belum pernah dibeli/diproduksi) — nilainya dianggap Rp 0.
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState title="Belum ada data" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3 text-right">Stok</th>
                <th className="py-2 pr-3 text-right">Harga Satuan</th>
                <th className="py-2 pr-3 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                  <td className="py-2 pr-3">{i.nama}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">
                    {formatAngka(i.stok)} {i.satuan}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">
                    {formatRupiah(i.hargaSatuan)}
                    {!i.hargaDiketahui && (
                      <Badge tone="amber" className="ml-1.5">
                        estimasi
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{formatRupiah(i.nilai)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function LaporanStokClient() {
  const [data, setData] = React.useState<NilaiStokResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/report/stok?export=1");
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Laporan Stok");
          return;
        }
        setData(json);
      } catch {
        toast.error("Tidak bisa terhubung ke server");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Laporan Stok" description="Level stok & nilai stok saat ini di semua outlet." />

      {loading || !data ? (
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <StatCard label="Total Nilai Stok" value={formatRupiah(data.totalNilaiStok)} />
            <StatCard label="Bahan Baku" value={formatRupiah(data.nilaiBahanBaku)} />
            <StatCard label="Kemasan" value={formatRupiah(data.nilaiKemasan)} />
            <StatCard label="Produk Jadi" value={formatRupiah(data.nilaiProdukJadi)} />
          </div>

          <Bagian title="Bahan Baku" items={data.bahanBaku} modul="laporan-stok-bahan-baku" />
          <Bagian title="Kemasan" items={data.kemasan} modul="laporan-stok-kemasan" />
          <Bagian title="Produk Jadi" items={data.produkJadi} modul="laporan-stok-produk-jadi" />
        </>
      )}
    </div>
  );
}
