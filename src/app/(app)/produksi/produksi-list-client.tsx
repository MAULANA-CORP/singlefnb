"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Factory } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal } from "@/lib/utils";

interface BatchOutputRingkas {
  id: string;
  produkJadi: { id: string; nama: string; satuan: string };
  qty: number;
  hppAlokasi: number;
}

interface BatchRingkas {
  id: string;
  nomor: string;
  tanggal: string;
  catatan: string | null;
  totalBiaya: number;
  outlet: { id: string; nama: string };
  user: { id: string; nama: string };
  jumlahBahanBaku: number;
  jumlahKemasan: number;
  output: BatchOutputRingkas[];
}

export function ProduksiListClient() {
  const [data, setData] = React.useState<BatchRingkas[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filterDari, setFilterDari] = React.useState("");
  const [filterSampai, setFilterSampai] = React.useState("");

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDari) params.set("dari", filterDari);
      if (filterSampai) params.set("sampai", filterSampai);
      const res = await fetch(`/api/produksi?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal memuat data produksi");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    muat();
  }, [muat]);

  return (
    <div>
      <PageHeader
        title="Proses Produksi"
        description="Riwayat batch produksi & alokasi HPP per produk jadi."
        action={
          <Link href="/produksi/baru">
            <Button size="lg">
              <Plus className="h-4 w-4" />
              Buat Batch Baru
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-end">
          <Input type="date" label="Dari Tanggal" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} />
          <Input type="date" label="Sampai Tanggal" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} />
          <Button variant="secondary" onClick={muat}>Terapkan</Button>
          {(filterDari || filterSampai) && (
            <Button variant="ghost" onClick={() => { setFilterDari(""); setFilterSampai(""); setTimeout(muat, 0); }}>Reset</Button>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Belum ada batch produksi"
            description="Mulai catat produksi pertama untuk melihat riwayatnya di sini."
            action={
              <Link href="/produksi/baru">
                <Button>
                  <Plus className="h-4 w-4" />
                  Buat Batch Baru
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Nomor</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Tanggal</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Outlet</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Bahan / Kemasan</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Output</th>
                  <th className="whitespace-nowrap py-2 pr-4 text-right font-medium">Total Biaya</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/produksi/${b.id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {b.nomor}
                      </Link>
                      <div className="text-xs text-gray-500 dark:text-gray-500">oleh {b.user.nama}</div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {formatTanggal(b.tanggal)}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {b.outlet.nama}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {b.jumlahBahanBaku} bahan baku, {b.jumlahKemasan} kemasan
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {b.output.map((o) => (
                          <span key={o.id} className="whitespace-nowrap">
                            {o.produkJadi.nama} ×{o.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right font-medium text-gray-900 dark:text-gray-50">
                      {formatRupiah(b.totalBiaya)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && data && data.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
          <Factory className="h-3.5 w-3.5" />
          Menampilkan {data.length} batch terakhir.
        </p>
      )}
    </div>
  );
}
