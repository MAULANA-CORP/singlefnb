"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ShoppingCart, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatRupiah, formatTanggalJam } from "@/lib/utils";
import {
  METODE_BAYAR_LABEL,
  METODE_BAYAR_OPTIONS,
  STATUS_BAYAR_OPTIONS,
  type OrderPOSListItem,
} from "./_lib";

export function PosListClient({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = React.useState<OrderPOSListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [metodeBayar, setMetodeBayar] = React.useState<string | null>(null);
  const [outlets, setOutlets] = React.useState<{ id: string; nama: string }[]>([]);
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [filterDari, setFilterDari] = React.useState("");
  const [filterSampai, setFilterSampai] = React.useState("");

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (metodeBayar) params.set("metodeBayar", metodeBayar);
      if (outletId) params.set("outletId", outletId);
      if (filterDari) params.set("dari", filterDari);
      if (filterSampai) params.set("sampai", filterSampai);

      const res = await fetch(`/api/pos?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat daftar order");
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [search, status, metodeBayar, outletId, filterDari, filterSampai]);

  React.useEffect(() => {
    const t = setTimeout(loadOrders, 300);
    return () => clearTimeout(t);
  }, [loadOrders]);

  React.useEffect(() => {
    fetch("/api/pos/outlets")
      .then((r) => r.json())
      .then((d) => setOutlets(d.outlets ?? []))
      .catch(() => {});
  }, []);

  const outletOptions = [{ value: "", label: "Semua Outlet" }, ...outlets.map((o) => ({ value: o.id, label: o.nama }))];
  const statusOptions = [{ value: "", label: "Semua Status" }, ...STATUS_BAYAR_OPTIONS];
  const metodeOptions = [{ value: "", label: "Semua Metode" }, ...METODE_BAYAR_OPTIONS];

  return (
    <div>
      <PageHeader
        title="POS (Retail)"
        description="Order penjualan langsung ke konsumen akhir."
        action={
          canCreate ? (
            <Button onClick={() => router.push("/pos/baru")}>
              <Plus className="h-4 w-4" />
              Buat Order Baru
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Cari nomor order / nama customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SearchableSelect
            placeholder="Semua Status"
            options={statusOptions}
            value={status}
            onChange={(v) => setStatus(v || null)}
          />
          <SearchableSelect
            placeholder="Semua Metode"
            options={metodeOptions}
            value={metodeBayar}
            onChange={(v) => setMetodeBayar(v || null)}
          />
          <SearchableSelect
            placeholder="Semua Outlet"
            options={outletOptions}
            value={outletId}
            onChange={(v) => setOutletId(v || null)}
          />
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Input type="date" label="Dari Tanggal" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Input type="date" label="Sampai Tanggal" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} />
          </div>
          {(filterDari || filterSampai) && (
            <Button variant="ghost" onClick={() => { setFilterDari(""); setFilterSampai(""); }}>Reset Tanggal</Button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada order POS"
            description="Order penjualan retail yang kamu buat akan muncul di sini."
            action={
              canCreate ? (
                <Button onClick={() => router.push("/pos/baru")}>
                  <Plus className="h-4 w-4" />
                  Buat Order Baru
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => router.push(`/pos/${order.id}`)}
              className="flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
                  <ShoppingCart className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-50">{order.nomor}</span>
                    <StatusBadge status={order.statusBayar} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
                    {order.customer?.nama ?? "-"} &middot; {order.outlet?.nama ?? "-"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                    {formatTanggalJam(order.createdAt)} &middot; {METODE_BAYAR_LABEL[order.metodeBayar]} &middot;{" "}
                    {order.items.length} item
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(order.total)}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
