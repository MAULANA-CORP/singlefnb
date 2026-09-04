"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Printer,
  Truck,
  Wallet,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal, formatTanggalJam, hariOverdue } from "@/lib/utils";
import { OrderStatusBadge } from "../_components/order-status-badge";
import type { OrderB2BDTO } from "../_components/types";

const METODE_OPTIONS: SelectOption[] = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER_QRIS", label: "Transfer / QRIS" },
  { value: "KREDIT", label: "Kredit" },
];

export function OrderDetailClient({ orderId, role }: { orderId: string; role: "OWNER" | "FINANCE" | "SALES" | "PRODUKSI" }) {
  const [order, setOrder] = React.useState<OrderB2BDTO | null>(null);
  const [loading, setLoading] = React.useState(true);

  const bisaKelola = role === "OWNER" || role === "SALES";

  const [dialogInvoiceLoading, setDialogInvoiceLoading] = React.useState(false);

  const [kirimOpen, setKirimOpen] = React.useState(false);
  const [noResi, setNoResi] = React.useState("");
  const [kirimLoading, setKirimLoading] = React.useState(false);

  const [bayarOpen, setBayarOpen] = React.useState(false);
  const [jumlahBayar, setJumlahBayar] = React.useState("");
  const [metodeBayar, setMetodeBayar] = React.useState<string | null>(null);
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = React.useState("");
  const [catatanBayar, setCatatanBayar] = React.useState("");
  const [bayarLoading, setBayarLoading] = React.useState(false);

  const [batalOpen, setBatalOpen] = React.useState(false);
  const [batalLoading, setBatalLoading] = React.useState(false);

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat order");
        setOrder(null);
        return;
      }
      setOrder(data.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    muat();
  }, [muat]);

  const sisaTagihan = order
    ? Math.max(0, order.total - (order.piutang?.totalTerbayar ?? 0))
    : 0;

  async function terbitkanInvoice() {
    setDialogInvoiceLoading(true);
    try {
      const res = await fetch(`/api/b2b/orders/${orderId}/invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menerbitkan invoice");
        return;
      }
      toast.success("Invoice berhasil diterbitkan");
      setOrder(data.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setDialogInvoiceLoading(false);
    }
  }

  async function submitKirim() {
    if (!noResi.trim()) {
      toast.error("No. Resi wajib diisi");
      return;
    }
    setKirimLoading(true);
    try {
      const res = await fetch(`/api/b2b/orders/${orderId}/kirim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noResi }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mencatat pengiriman");
        return;
      }
      toast.success("Pengiriman berhasil dicatat");
      setOrder(data.data);
      setKirimOpen(false);
      setNoResi("");
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setKirimLoading(false);
    }
  }

  function bukaBayarDialog() {
    setJumlahBayar(sisaTagihan ? String(sisaTagihan) : "");
    setMetodeBayar(order?.metodeBayar ?? "TRANSFER_QRIS");
    setTanggalJatuhTempo(order?.piutang?.jatuhTempo ? order.piutang.jatuhTempo.slice(0, 10) : "");
    setCatatanBayar("");
    setBayarOpen(true);
  }

  async function submitBayar() {
    const jumlah = Number(jumlahBayar);
    if (!(jumlah > 0)) {
      toast.error("Jumlah bayar harus lebih dari 0");
      return;
    }
    const belumLunasSetelahBayar = jumlah < sisaTagihan;
    if (belumLunasSetelahBayar && !order?.piutang && !tanggalJatuhTempo) {
      toast.error("Tanggal jatuh tempo wajib diisi untuk pembayaran sebagian");
      return;
    }
    setBayarLoading(true);
    try {
      const res = await fetch(`/api/b2b/orders/${orderId}/bayar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jumlah,
          metodeBayar,
          tanggalJatuhTempo: tanggalJatuhTempo || undefined,
          catatan: catatanBayar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mencatat pembayaran");
        return;
      }
      toast.success("Pembayaran berhasil dicatat");
      setOrder(data.data);
      setBayarOpen(false);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setBayarLoading(false);
    }
  }

  async function submitBatal() {
    setBatalLoading(true);
    try {
      const res = await fetch(`/api/b2b/orders/${orderId}/batal`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal membatalkan order");
        return;
      }
      toast.success("Order dibatalkan, stok dikembalikan");
      setOrder(data.data);
      setBatalOpen(false);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setBatalLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detail Order B2B" />
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState title="Order tidak ditemukan" description="Order mungkin sudah dihapus atau Anda tidak punya akses." />
    );
  }

  const bisaTerbitkanInvoice = bisaKelola && order.status === "DRAFT";
  const bisaKirim = bisaKelola && !!order.invoice && !order.suratJalan && order.status !== "BATAL";
  const bisaBayar = bisaKelola && !!order.invoice && order.statusBayar !== "LUNAS" && order.status !== "BATAL";
  const bisaBatal = bisaKelola && (order.status === "DRAFT" || order.status === "INVOICE") && !order.suratJalan;

  const overdueHari = order.piutang && order.piutang.status !== "LUNAS" ? hariOverdue(order.piutang.jatuhTempo) : null;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/b2b/history"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar order
        </Link>
      </div>

      <PageHeader
        title={order.nomor}
        description={`${order.agen.nama} · ${order.outlet.nama} · ${formatTanggal(order.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.invoice && (
              <Link
                href={`/b2b/${order.id}/invoice`}
                target="_blank"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-50 dark:hover:bg-zinc-700"
              >
                <Printer className="h-4 w-4" />
                Cetak Invoice
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Item Produk</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                    <th className="py-2 pr-3 font-medium">Produk</th>
                    <th className="py-2 pr-3 font-medium text-right">Qty</th>
                    <th className="py-2 pr-3 font-medium text-right">Harga</th>
                    <th className="py-2 pr-0 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                      <td className="py-2.5 pr-3 text-gray-900 dark:text-gray-50">{it.produkJadi?.nama ?? it.produkJadiId}</td>
                      <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300">
                        {it.qty} {it.produkJadi?.satuan}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300">{formatRupiah(it.hargaSatuan)}</td>
                      <td className="py-2.5 pr-0 text-right font-medium text-gray-900 dark:text-gray-50">
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-zinc-700">
              <div className="w-full max-w-[220px] space-y-1 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatRupiah(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-gray-50">
                  <span>Total</span>
                  <span>{formatRupiah(order.total)}</span>
                </div>
              </div>
            </div>
            {order.catatan && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-zinc-900 dark:text-gray-300">
                Catatan: {order.catatan}
              </p>
            )}
          </Card>

          {order.piutang && (
            <Card>
              <CardHeader>
                <CardTitle>Piutang & Riwayat Pembayaran</CardTitle>
              </CardHeader>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                <StatusBadge status={order.piutang.status} />
                <span className="text-gray-600 dark:text-gray-400">
                  Terbayar {formatRupiah(order.piutang.totalTerbayar)} / {formatRupiah(order.piutang.totalTagihan)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Jatuh tempo {formatTanggal(order.piutang.jatuhTempo)}
                </span>
                {overdueHari !== null && overdueHari > 30 && (
                  <Badge tone="red">Overdue {overdueHari} hari</Badge>
                )}
              </div>
              {order.piutang.pembayaran && order.piutang.pembayaran.length > 0 ? (
                <ul className="space-y-2">
                  {order.piutang.pembayaran.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-zinc-900"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{formatTanggalJam(p.tanggal)}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-50">{formatRupiah(p.jumlah)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-500">Belum ada riwayat cicilan.</p>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alur Order</CardTitle>
            </CardHeader>
            <ol className="space-y-4">
              <LangkahAlur
                selesai
                icon={FileText}
                judul="Order Dibuat"
                sub={formatTanggalJam(order.createdAt)}
              />
              <LangkahAlur
                selesai={!!order.invoice}
                icon={FileText}
                judul="Invoice Diterbitkan"
                sub={order.invoice ? `${order.invoice.nomorInvoice} · ${formatTanggal(order.invoice.tanggalTerbit)}` : undefined}
                action={
                  bisaTerbitkanInvoice && (
                    <Button size="sm" loading={dialogInvoiceLoading} onClick={terbitkanInvoice}>
                      Terbitkan Invoice
                    </Button>
                  )
                }
              />
              <LangkahAlur
                selesai={!!order.suratJalan}
                icon={Truck}
                judul="Dikirim"
                sub={order.suratJalan ? `Resi ${order.suratJalan.noResi} · ${formatTanggal(order.suratJalan.tanggalKirim)}` : undefined}
                action={
                  bisaKirim && (
                    <Button size="sm" onClick={() => setKirimOpen(true)}>
                      Kirim Barang
                    </Button>
                  )
                }
              />
              <LangkahAlur
                selesai={order.statusBayar === "LUNAS"}
                icon={Wallet}
                judul="Pembayaran"
                sub={
                  order.statusBayar === "LUNAS"
                    ? "Lunas"
                    : order.statusBayar === "PARSIAL"
                      ? `Sisa ${formatRupiah(sisaTagihan)}`
                      : order.invoice
                        ? `Belum dibayar · ${formatRupiah(order.total)}`
                        : undefined
                }
                action={
                  bisaBayar && (
                    <Button size="sm" onClick={bukaBayarDialog}>
                      Catat Pembayaran
                    </Button>
                  )
                }
              />
            </ol>

            {order.status === "BATAL" && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                <Ban className="h-4 w-4 shrink-0" />
                Order ini telah dibatalkan. Stok telah dikembalikan.
              </div>
            )}

            {bisaBatal && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-zinc-700">
                <Button variant="danger" size="sm" className="w-full" onClick={() => setBatalOpen(true)}>
                  Batalkan Order
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Info Agen</CardTitle>
            </CardHeader>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-500">Nama</dt>
                <dd className="text-gray-900 dark:text-gray-50">{order.agen.nama}</dd>
              </div>
              {order.agen.kontak && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-500">Kontak</dt>
                  <dd className="text-gray-900 dark:text-gray-50">{order.agen.kontak}</dd>
                </div>
              )}
              {order.agen.alamat && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-500">Alamat</dt>
                  <dd className="text-gray-900 dark:text-gray-50">{order.agen.alamat}</dd>
                </div>
              )}
              {order.user && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-500">Dibuat oleh</dt>
                  <dd className="text-gray-900 dark:text-gray-50">{order.user.nama}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      {/* Dialog: Kirim */}
      <Dialog open={kirimOpen} onOpenChange={setKirimOpen} title="Catat Pengiriman" description="Masukkan No. Resi pengiriman untuk order ini.">
        <div className="space-y-3">
          <Input label="No. Resi" required autoFocus value={noResi} onChange={(e) => setNoResi(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setKirimOpen(false)}>
              Batal
            </Button>
            <Button type="button" loading={kirimLoading} onClick={submitKirim}>
              Simpan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Bayar */}
      <Dialog
        open={bayarOpen}
        onOpenChange={setBayarOpen}
        title="Catat Pembayaran"
        description={`Sisa tagihan saat ini: ${formatRupiah(sisaTagihan)}`}
      >
        <div className="space-y-3">
          <Input
            label="Jumlah Bayar"
            type="number"
            required
            min={0}
            max={sisaTagihan}
            value={jumlahBayar}
            onChange={(e) => setJumlahBayar(e.target.value)}
          />
          <SearchableSelect
            label="Metode Bayar"
            options={METODE_OPTIONS}
            value={metodeBayar}
            onChange={setMetodeBayar}
          />
          {Number(jumlahBayar) < sisaTagihan && (
            <Input
              label="Tanggal Jatuh Tempo"
              type="date"
              required={!order.piutang}
              value={tanggalJatuhTempo}
              onChange={(e) => setTanggalJatuhTempo(e.target.value)}
            />
          )}
          <Textarea label="Catatan (opsional)" value={catatanBayar} onChange={(e) => setCatatanBayar(e.target.value)} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBayarOpen(false)}>
              Batal
            </Button>
            <Button type="button" loading={bayarLoading} onClick={submitBayar}>
              Simpan Pembayaran
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={batalOpen}
        onOpenChange={setBatalOpen}
        title="Batalkan order ini?"
        description="Stok produk yang sudah dikurangi akan dikembalikan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, Batalkan"
        danger
        loading={batalLoading}
        onConfirm={submitBatal}
      />
    </div>
  );
}

function LangkahAlur({
  selesai,
  icon: Icon,
  judul,
  sub,
  action,
}: {
  selesai: boolean;
  icon: React.ElementType;
  judul: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        {selesai ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300 dark:text-zinc-600" />
        )}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${selesai ? "text-gray-600 dark:text-gray-400" : "text-gray-300 dark:text-zinc-600"}`} />
          <p className={`text-sm font-medium ${selesai ? "text-gray-900 dark:text-gray-50" : "text-gray-500 dark:text-gray-500"}`}>
            {judul}
          </p>
        </div>
        {sub && <p className="mt-0.5 pl-6 text-xs text-gray-600 dark:text-gray-400">{sub}</p>}
        {action && <div className="mt-2 pl-6">{action}</div>}
      </div>
    </li>
  );
}
