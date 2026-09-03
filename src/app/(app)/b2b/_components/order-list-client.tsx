"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { OrderStatusBadge, STATUS_FILTERS } from "./order-status-badge";
import type { OrderB2BDTO } from "./types";

export function OrderListClient({ role }: { role: "OWNER" | "FINANCE" | "SALES" | "PRODUKSI" }) {
  const [orders, setOrders] = React.useState<OrderB2BDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<string>("SEMUA");
  const [q, setQ] = React.useState("");

  const bisaBuatOrder = role === "OWNER" || role === "SALES";

  const muatData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "SEMUA") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/b2b/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat data order");
        return;
      }
      setOrders(data.data ?? []);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  React.useEffect(() => {
    const timer = setTimeout(muatData, q ? 350 : 0);
    return () => clearTimeout(timer);
  }, [muatData, q]);

  return (
    <div>
      <PageHeader
        title="B2B — Penjualan ke Agen"
        description="Order, invoice, pengiriman, dan pembayaran untuk Agen/Distributor."
        action={
          bisaBuatOrder && (
            <Link
              href="/b2b/baru"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-zinc-900"
            >
              <Plus className="h-4 w-4" />
              Buat Order
            </Link>
          )
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Cari nomor order / nama outlet..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && muatData()}
              className="w-full rounded-md border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-zinc-900">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Belum ada order B2B"
            description="Order yang dibuat untuk Agen/Distributor akan muncul di sini."
            action={
              bisaBuatOrder && (
                <Link
                  href="/b2b/baru"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  <Plus className="h-4 w-4" />
                  Buat Order Pertama
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">Nomor</th>
                  <th className="py-2 pr-3 font-medium">Agen</th>
                  <th className="py-2 pr-3 font-medium">Outlet</th>
                  <th className="py-2 pr-3 font-medium">Tanggal</th>
                  <th className="py-2 pr-3 font-medium text-right">Total</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-0 font-medium" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-3 pr-3 font-medium text-gray-900 dark:text-gray-50">{o.nomor}</td>
                    <td className="py-3 pr-3 text-gray-700 dark:text-gray-300">{o.agen?.nama}</td>
                    <td className="py-3 pr-3 text-gray-700 dark:text-gray-300">{o.outlet?.nama}</td>
                    <td className="py-3 pr-3 text-gray-600 dark:text-gray-400">{formatTanggal(o.createdAt)}</td>
                    <td className="py-3 pr-3 text-right font-medium text-gray-900 dark:text-gray-50">
                      {formatRupiah(o.total)}
                    </td>
                    <td className="py-3 pr-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="py-3 pr-0 text-right">
                      <Link
                        href={`/b2b/${o.id}`}
                        className="inline-flex min-h-[36px] items-center rounded-lg px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {orders.length === 0 && !loading && (
        <div className="mt-6 flex justify-center text-gray-400">
          <Briefcase className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
