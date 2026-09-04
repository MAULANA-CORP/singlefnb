"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingSkeleton, EmptyState } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal, formatTanggalJam } from "@/lib/utils";
import { METODE_BAYAR_LABEL, type OrderPOSListItem } from "../_lib";

export function OrderDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = React.useState<OrderPOSListItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pos/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Gagal memuat order");
          return;
        }
        setOrder(data.order);
      } catch {
        toast.error("Tidak bisa terhubung ke server");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Detail Order POS" />
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div>
        <PageHeader title="Detail Order POS" />
        <Card>
          <EmptyState
            title="Order tidak ditemukan"
            description="Order ini mungkin sudah dihapus atau URL tidak valid."
            action={
              <Button variant="secondary" onClick={() => router.push("/pos/history")}>
                <ArrowLeft className="h-4 w-4" />
                Kembali ke daftar POS
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const sisaTagihan = order.piutang ? order.piutang.totalTagihan - order.piutang.totalTerbayar : 0;

  return (
    <div>
      <PageHeader
        title={order.nomor}
        description={`Dibuat ${formatTanggalJam(order.createdAt)} oleh ${order.user?.nama ?? "-"}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/pos/history")}>
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Cetak
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Order</CardTitle>
            <StatusBadge status={order.statusBayar} />
          </CardHeader>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-500">Customer</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-50">{order.customer?.nama ?? "-"}</dd>
              {order.customer?.kontak && (
                <dd className="text-gray-600 dark:text-gray-400">{order.customer.kontak}</dd>
              )}
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-500">Outlet</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-50">{order.outlet?.nama ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-500">Metode Bayar</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-50">
                {METODE_BAYAR_LABEL[order.metodeBayar]}
              </dd>
            </div>
            {order.tanggalJatuhTempo && (
              <div>
                <dt className="text-gray-500 dark:text-gray-500">Jatuh Tempo</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-50">
                  {formatTanggal(order.tanggalJatuhTempo)}
                </dd>
              </div>
            )}
            {order.catatan && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500 dark:text-gray-500">Catatan</dt>
                <dd className="text-gray-900 dark:text-gray-50">{order.catatan}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Item Produk</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-zinc-700 dark:text-gray-500">
                  <th className="pb-2 font-medium">Produk</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Harga</th>
                  <th className="pb-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100 dark:border-zinc-700/50">
                    <td className="py-2 text-gray-900 dark:text-gray-50">{it.namaProduk}</td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                      {it.qty} {it.satuan}
                    </td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatRupiah(it.hargaSatuan)}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-50">
                      {formatRupiah(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-xs justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between text-base font-semibold text-gray-900 dark:text-gray-50">
              <span>Total</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
          </div>
        </Card>

        {order.piutang && (
          <Card>
            <CardHeader>
              <CardTitle>Piutang</CardTitle>
              <StatusBadge status={order.piutang.status} />
            </CardHeader>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-gray-500 dark:text-gray-500">Total Tagihan</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-50">
                  {formatRupiah(order.piutang.totalTagihan)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-500">Sudah Terbayar</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-50">
                  {formatRupiah(order.piutang.totalTerbayar)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-500">Sisa</dt>
                <dd className="font-medium text-red-600 dark:text-red-400">{formatRupiah(sisaTagihan)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-500">Jatuh Tempo</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-50">
                  {formatTanggal(order.piutang.jatuhTempo)}
                </dd>
              </div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}
