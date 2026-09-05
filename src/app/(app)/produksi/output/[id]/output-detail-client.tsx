"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/utils";

interface ProsesInfo {
  id: string;
  nomor: string;
  nama: string | null;
  status: string;
  tanggal: string;
}

interface BiayaLainInfo {
  id: string;
  kategori: string;
  jumlah: number;
  catatan: string | null;
}

interface KemasanInfo {
  id: string;
  kemasan: { id: string; nama: string; satuan: string };
  qtyPakai: number;
  hargaSatuanSaatItu: number;
  subtotal: number;
}

interface ProdukJadiInfo {
  id: string;
  produkJadi: { id: string; nama: string; satuan: string; beratBersih: number | null };
  qty: number;
  totalBerat: number;
  beratFallback: boolean;
  hppAlokasi: number;
  hppPerUnit: number;
  porsiBerat: number;
}

interface OutputDetail {
  id: string;
  nomor: string;
  tanggal: string;
  catatan: string | null;
  totalBiaya: number;
  totalBiayaProses: number;
  totalBiayaKemasan: number;
  totalBiayaLain: number;
  biayaLain: BiayaLainInfo[];
  outlet: { id: string; nama: string };
  user: { id: string; nama: string };
  proses: ProsesInfo[];
  kemasan: KemasanInfo[];
  produkJadi: ProdukJadiInfo[];
  totalBeratSemuaOutput: number;
}

export function OutputDetailClient({ id }: { id: string }) {
  const [data, setData] = React.useState<OutputDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/produksi/output/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          toast.error(json.error);
        } else {
          setData(json.data);
        }
      })
      .catch(() => toast.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-sm text-muted-foreground">Output tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.nomor}
        description={`Output produksi · ${formatTanggal(data.tanggal)}`}
        action={
          <Link href="/produksi" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      {/* Info Umum */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Output</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Outlet</dt>
              <dd className="font-medium">{data.outlet.nama}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dicatat oleh</dt>
              <dd className="font-medium">{data.user.nama}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total Biaya (HPP)</dt>
              <dd className="font-medium">{formatRupiah(data.totalBiaya)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Biaya Proses</dt>
              <dd className="font-medium">{formatRupiah(data.totalBiayaProses)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Biaya Kemasan</dt>
              <dd className="font-medium">{formatRupiah(data.totalBiayaKemasan)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Biaya Lain</dt>
              <dd className="font-medium">{formatRupiah(data.totalBiayaLain)}</dd>
            </div>
            {data.catatan && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Catatan</dt>
                <dd className="font-medium">{data.catatan}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Proses Terkait */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proses Terkait</CardTitle>
        </CardHeader>
        <CardContent>
          {data.proses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada proses terkait.</p>
          ) : (
            <div className="space-y-2">
              {data.proses.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Link href={`/produksi/proses/${p.id}`} className="font-medium text-sm hover:underline">
                      {p.nomor}
                    </Link>
                    {p.nama && <span className="ml-2 text-sm text-muted-foreground">({p.nama})</span>}
                  </div>
                  <Badge tone={p.status === "SELESAI" ? "green" : "gray"}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produk Jadi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produk Jadi</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Produk</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">HPP/Unit</th>
                <th className="pb-2 text-right">HPP Total</th>
              </tr>
            </thead>
            <tbody>
              {data.produkJadi.map((pj) => (
                <tr key={pj.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{pj.produkJadi.nama}</td>
                  <td className="py-2 text-right">{formatAngka(pj.qty)} {pj.produkJadi.satuan}</td>
                  <td className="py-2 text-right">{formatRupiah(pj.hppPerUnit)}</td>
                  <td className="py-2 text-right">{formatRupiah(pj.hppAlokasi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Biaya Lain */}
      {data.biayaLain && data.biayaLain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biaya Lain</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Kategori</th>
                  <th className="pb-2 text-right">Jumlah</th>
                  <th className="pb-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {data.biayaLain.map((bl) => (
                  <tr key={bl.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{bl.kategori}</td>
                    <td className="py-2 text-right">{formatRupiah(bl.jumlah)}</td>
                    <td className="py-2 text-muted-foreground">{bl.catatan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Kemasan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kemasan</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Kemasan</th>
                <th className="pb-2 text-right">Qty Pakai</th>
                <th className="pb-2 text-right">Harga Satuan</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.kemasan.map((k) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{k.kemasan.nama}</td>
                  <td className="py-2 text-right">{formatAngka(k.qtyPakai)} {k.kemasan.satuan}</td>
                  <td className="py-2 text-right">{formatRupiah(k.hargaSatuanSaatItu)}</td>
                  <td className="py-2 text-right">{formatRupiah(k.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
