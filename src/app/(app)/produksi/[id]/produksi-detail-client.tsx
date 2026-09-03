"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton, EmptyState } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/utils";

interface DetailBahanBaku {
  id: string;
  bahanBaku: { id: string; nama: string; satuan: string };
  qtyPakai: number;
  qtyWaste: number;
  hargaSatuanSaatItu: number;
  subtotal: number;
}

interface DetailKemasan {
  id: string;
  kemasan: { id: string; nama: string; satuan: string };
  qtyPakai: number;
  hargaSatuanSaatItu: number;
  subtotal: number;
}

interface DetailOutput {
  id: string;
  produkJadi: { id: string; nama: string; satuan: string; beratBersih: number | null };
  qty: number;
  totalBerat: number;
  beratFallback: boolean;
  hppAlokasi: number;
  hppPerUnit: number;
  porsiBerat: number;
}

interface DetailBatch {
  id: string;
  nomor: string;
  tanggal: string;
  catatan: string | null;
  totalBiaya: number;
  outlet: { id: string; nama: string };
  user: { id: string; nama: string };
  bahanBaku: DetailBahanBaku[];
  kemasan: DetailKemasan[];
  output: DetailOutput[];
  totalBeratSemuaOutput: number;
}

export function ProduksiDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<DetailBatch | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/produksi/${id}`);
        const json = await res.json();
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat detail batch");
          return;
        }
        setData(json.data);
      } catch {
        toast.error("Tidak bisa terhubung ke server");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Detail Batch Produksi" />
        <Card>
          <LoadingSkeleton rows={8} />
        </Card>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div>
        <PageHeader title="Detail Batch Produksi" />
        <Card>
          <EmptyState
            title="Batch tidak ditemukan"
            action={
              <Button onClick={() => router.push("/produksi")}>
                <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const adaFallback = data.output.some((o) => o.beratFallback);

  return (
    <div>
      <PageHeader
        title={`Batch ${data.nomor}`}
        description={`${formatTanggal(data.tanggal)} · ${data.outlet.nama} · dicatat oleh ${data.user.nama}`}
        action={
          <Link href="/produksi">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
        }
      />

      {data.catatan && (
        <Card className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-gray-50">Catatan: </span>
            {data.catatan}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bahan Baku Dipakai</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">Bahan</th>
                  <th className="py-2 pr-3 text-right font-medium">Qty Pakai</th>
                  <th className="py-2 pr-3 text-right font-medium">Waste</th>
                  <th className="py-2 pr-3 text-right font-medium">Harga Satuan</th>
                  <th className="py-2 pr-3 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {data.bahanBaku.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2 pr-3 text-gray-900 dark:text-gray-50">{b.bahanBaku.nama}</td>
                    <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                      {formatAngka(b.qtyPakai, 3)} {b.bahanBaku.satuan}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                      {b.qtyWaste > 0 ? `${formatAngka(b.qtyWaste, 3)} ${b.bahanBaku.satuan}` : "-"}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                      {formatRupiah(b.hargaSatuanSaatItu)}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-gray-900 dark:text-gray-50">
                      {formatRupiah(b.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kemasan Dipakai</CardTitle>
          </CardHeader>
          {data.kemasan.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-500">Tidak ada kemasan dicatat untuk batch ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                    <th className="py-2 pr-3 font-medium">Kemasan</th>
                    <th className="py-2 pr-3 text-right font-medium">Qty Pakai</th>
                    <th className="py-2 pr-3 text-right font-medium">Harga Satuan</th>
                    <th className="py-2 pr-3 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kemasan.map((k) => (
                    <tr key={k.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                      <td className="py-2 pr-3 text-gray-900 dark:text-gray-50">{k.kemasan.nama}</td>
                      <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                        {formatAngka(k.qtyPakai, 3)} {k.kemasan.satuan}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                        {formatRupiah(k.hargaSatuanSaatItu)}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-gray-900 dark:text-gray-50">
                        {formatRupiah(k.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Alokasi HPP ke Output Produk</CardTitle>
        </CardHeader>

        {adaFallback && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Ada produk tanpa berat bersih — alokasinya pakai qty sebagai proxy berat (kurang akurat).
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                <th className="py-2 pr-3 font-medium">Produk</th>
                <th className="py-2 pr-3 text-right font-medium">Berat Bersih</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 pr-3 text-right font-medium">Total Berat</th>
                <th className="py-2 pr-3 text-right font-medium">Porsi Berat</th>
                <th className="py-2 pr-3 text-right font-medium">Alokasi Biaya</th>
                <th className="py-2 pr-3 text-right font-medium">HPP/Unit</th>
              </tr>
            </thead>
            <tbody>
              {data.output.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                  <td className="py-2 pr-3 text-gray-900 dark:text-gray-50">
                    {o.produkJadi.nama}
                    {o.beratFallback && (
                      <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">(fallback qty)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {o.produkJadi.beratBersih != null ? `${o.produkJadi.beratBersih}gr` : "-"}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">{formatAngka(o.qty, 0)}</td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {formatAngka(o.totalBerat, 0)} gr
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {formatAngka(o.porsiBerat * 100, 1)}%
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {formatRupiah(o.hppAlokasi)}
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold text-gray-900 dark:text-gray-50">
                    {formatRupiah(o.hppPerUnit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-medium text-gray-900 dark:border-zinc-700 dark:text-gray-50">
                <td className="py-2 pr-3" colSpan={3}>
                  Total
                </td>
                <td className="py-2 pr-3 text-right">{formatAngka(data.totalBeratSemuaOutput, 0)} gr</td>
                <td className="py-2 pr-3 text-right">100%</td>
                <td className="py-2 pr-3 text-right">{formatRupiah(data.totalBiaya)}</td>
                <td className="py-2 pr-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
