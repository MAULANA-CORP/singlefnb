"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Package,
  Trophy,
  Factory,
  Boxes,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/utils";
import type { Role } from "@/lib/session";

interface OmzetRingkas {
  hariIniPOS: number;
  hariIniB2B: number;
  hariIni: number;
  bulanIniPOS: number;
  bulanIniB2B: number;
  bulanIni: number;
}
interface GrafikHarian {
  tanggal: string;
  omzet: number;
}
interface JatuhTempoRingkas {
  jumlahJatuhTempo: number;
  jumlahOverdue30: number;
  totalSisa: number;
}
interface TopAgen {
  agenId: string;
  nama: string;
  omzet: number;
}
interface TopProduk {
  produkJadiId: string;
  nama: string;
  qty: number;
}
interface StokMenipisItem {
  id: string;
  nama: string;
  kategori: "Bahan Baku" | "Kemasan" | "Produk Jadi";
  stok: number;
  stokMinimum: number;
  satuan: string;
}
interface ProduksiTerakhir {
  id: string;
  nomor: string;
  tanggal: string;
  wastePersen: number;
  outletNama: string;
}

type Payload =
  | {
      role: "OWNER" | "FINANCE";
      omzet: OmzetRingkas;
      grafik: GrafikHarian[];
      saldoKas: number;
      piutang: JatuhTempoRingkas;
      utang: JatuhTempoRingkas;
      topAgen: TopAgen[];
      topProduk: TopProduk[];
      stokMenipis: StokMenipisItem[];
    }
  | { role: "SALES"; omzetSaya: { hariIni: number; bulanIni: number }; piutangSaya: { jumlah: number; totalSisa: number } }
  | { role: "PRODUKSI"; produksiTerakhir: ProduksiTerakhir | null; stokMenipis: StokMenipisItem[] };

function StokMenipisCard({ items }: { items: StokMenipisItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok Menipis</CardTitle>
        <Link href="/inventory" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          Lihat Inventory
        </Link>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState title="Semua stok aman" description="Tidak ada item di bawah stok minimum." />
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((i) => (
            <div key={`${i.kategori}-${i.id}`} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge tone="red">{i.kategori}</Badge>
                <span className="truncate text-gray-900 dark:text-gray-50">{i.nama}</span>
              </div>
              <span className="shrink-0 whitespace-nowrap text-gray-600 dark:text-gray-400">
                {formatAngka(i.stok)} / ROP {formatAngka(i.stokMinimum)} {i.satuan}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DashboardClient({ role }: { role: Role }) {
  const [data, setData] = React.useState<Payload | null>(null);
  const [outlets, setOutlets] = React.useState<{id: string; nama: string}[]>([]);
  const [selectedOutlet, setSelectedOutlet] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (role === "OWNER" || role === "FINANCE") {
      fetch("/api/finance/outlets").then(r => r.json()).then(d => {
        if (Array.isArray(d.data)) setOutlets(d.data);
      }).catch(console.error);
    }
  }, [role]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard${selectedOutlet !== "ALL" ? "?outletId=" + selectedOutlet : ""}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat Dashboard");
          return;
        }
        setData(json);
      } catch {
        toast.error("Tidak bisa terhubung ke server");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedOutlet]);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      </div>
    );
  }

  if (data.role === "SALES") {
    return (
      <div>
        <PageHeader title="Dashboard" description="Ringkasan penjualan kamu." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Omzet Hari Ini" value={formatRupiah(data.omzetSaya.hariIni)} icon={TrendingUp} />
          <StatCard label="Omzet Bulan Ini" value={formatRupiah(data.omzetSaya.bulanIni)} icon={TrendingUp} />
          <StatCard
            label="Piutang yang Kamu Pegang"
            value={String(data.piutangSaya.jumlah)}
            hint={`Total sisa ${formatRupiah(data.piutangSaya.totalSisa)}`}
            icon={Wallet}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/pos" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            Buka POS
          </Link>
          <Link href="/b2b" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            Buka B2B
          </Link>
        </div>
      </div>
    );
  }

  if (data.role === "PRODUKSI") {
    return (
      <div>
        <PageHeader title="Dashboard" description="Ringkasan produksi & stok bahan." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Batch Produksi Terakhir</CardTitle>
              <Link href="/produksi" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                Lihat Semua
              </Link>
            </CardHeader>
            {!data.produksiTerakhir ? (
              <EmptyState title="Belum ada batch produksi" />
            ) : (
              <div className="space-y-1.5 text-sm">
                <p className="text-gray-900 dark:text-gray-50">
                  <span className="font-medium">{data.produksiTerakhir.nomor}</span> — {data.produksiTerakhir.outletNama}
                </p>
                <p className="text-gray-600 dark:text-gray-400">{formatTanggal(data.produksiTerakhir.tanggal)}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Waste: <span className="font-medium text-amber-600 dark:text-amber-400">{data.produksiTerakhir.wastePersen.toFixed(1)}%</span>
                </p>
              </div>
            )}
          </Card>
          <StokMenipisCard items={data.stokMenipis} />
        </div>
        <div className="mt-4">
          <Link href="/produksi/proses/baru" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            + Buat Batch Produksi Baru
          </Link>
        </div>
      </div>
    );
  }

  // OWNER / FINANCE
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader title="Dashboard" description="Ringkasan bisnis lintas semua modul." />
        <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
          <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
            <SelectValue placeholder="Semua Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Outlet</SelectItem>
            {outlets.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Omzet Hari Ini" value={formatRupiah(data.omzet.hariIni)} icon={TrendingUp} hint={`POS ${formatRupiah(data.omzet.hariIniPOS)} · B2B ${formatRupiah(data.omzet.hariIniB2B)}`} />
        <StatCard label="Omzet Bulan Ini" value={formatRupiah(data.omzet.bulanIni)} icon={TrendingUp} hint={`POS ${formatRupiah(data.omzet.bulanIniPOS)} · B2B ${formatRupiah(data.omzet.bulanIniB2B)}`} />
        <StatCard label="Saldo Kas Saat Ini" value={formatRupiah(data.saldoKas)} icon={Wallet} />
        <StatCard
          label="Piutang Overdue > 30 Hari"
          value={String(data.piutang.jumlahOverdue30)}
          tone={data.piutang.jumlahOverdue30 > 0 ? "danger" : "default"}
          icon={AlertTriangle}
          hint={`Total sisa piutang ${formatRupiah(data.piutang.totalSisa)}`}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Utang Overdue > 30 Hari"
          value={String(data.utang.jumlahOverdue30)}
          tone={data.utang.jumlahOverdue30 > 0 ? "danger" : "default"}
          icon={AlertTriangle}
          hint={`Total sisa utang ${formatRupiah(data.utang.totalSisa)}`}
        />
        <StatCard label="Piutang Jatuh Tempo" value={String(data.piutang.jumlahJatuhTempo)} hint="Sudah lewat tanggal jatuh tempo" />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Omzet 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.grafik}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
              <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTanggal(v)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatRupiah(v)} width={90} />
              <Tooltip formatter={(value) => formatRupiah(Number(value))} labelFormatter={(v) => formatTanggal(String(v))} />
              <Bar dataKey="omzet" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Agen (Bulan Ini)</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          {data.topAgen.length === 0 ? (
            <EmptyState title="Belum ada penjualan B2B bulan ini" />
          ) : (
            <div className="space-y-2">
              {data.topAgen.map((a, i) => (
                <div key={a.agenId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 dark:text-gray-50">
                    {i + 1}. {a.nama}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatRupiah(a.omzet)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris (Bulan Ini)</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          {data.topProduk.length === 0 ? (
            <EmptyState title="Belum ada penjualan bulan ini" />
          ) : (
            <div className="space-y-2">
              {data.topProduk.map((p, i) => (
                <div key={p.produkJadiId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 dark:text-gray-50">
                    {i + 1}. {p.nama}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatAngka(p.qty)} unit</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <StokMenipisCard items={data.stokMenipis} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/report" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          <Boxes className="h-4 w-4" /> Lihat Report Lengkap
        </Link>
        <Link href="/produksi" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          <Factory className="h-4 w-4" /> Proses Produksi
        </Link>
      </div>
    </div>
  );
}
