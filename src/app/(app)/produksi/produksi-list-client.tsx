"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Factory, Beaker, Package, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Pagination } from "@/components/ui/pagination";
import { formatRupiah, formatTanggal } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------

interface ProsesRingkas {
  id: string;
  nomor: string;
  nama: string | null;
  tanggal: string;
  status: string;
  catatan: string | null;
  totalBiaya: number;
  outlet: { id: string; nama: string };
  user: { id: string; nama: string };
  jumlahBahanBaku: number;
}

interface OutputRingkas {
  id: string;
  nomor: string;
  tanggal: string;
  catatan: string | null;
  totalBiaya: number;
  outlet: { id: string; nama: string };
  user: { id: string; nama: string };
  jumlahProses: number;
  proses: { id: string; nomor: string; nama: string | null }[];
  produkJadi: { id: string; produkJadi: { id: string; nama: string; satuan: string }; qty: number; hppAlokasi: number }[];
  jumlahKemasan: number;
}

function statusBadge(status: string) {
  const map: Record<string, { tone: "gray" | "green" | "red"; label: string }> = {
    DRAFT: { tone: "gray", label: "Draft" },
    SELESAI: { tone: "green", label: "Selesai" },
    DIBATALKAN: { tone: "red", label: "Dibatalkan" },
  };
  const s = map[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
];

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Tab Proses
// ---------------------------------------------------------------------------

function ProsesTab() {
  const [data, setData] = React.useState<ProsesRingkas[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("");
  const [filterDari, setFilterDari] = React.useState("");
  const [filterSampai, setFilterSampai] = React.useState("");
  const [page, setPage] = React.useState(1);

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (filterDari) params.set("dari", filterDari);
      if (filterSampai) params.set("sampai", filterSampai);
      const res = await fetch(`/api/produksi/proses?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal memuat data proses");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [status, filterDari, filterSampai]);

  React.useEffect(() => {
    muat();
  }, [muat]);

  React.useEffect(() => { setPage(1); }, [search, status, filterDari, filterSampai]);

  // Client-side search filter
  const filtered = React.useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (p) =>
        p.nomor.toLowerCase().includes(q) ||
        (p.nama && p.nama.toLowerCase().includes(q))
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nomor / nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <SearchableSelect
            placeholder="Semua Status"
            options={STATUS_OPTIONS}
            value={status || null}
            onChange={(v) => setStatus(v ?? "")}
          />
          <Input type="date" label="Dari Tanggal" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} />
          <Input type="date" label="Sampai Tanggal" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} />
          <Button variant="ghost" onClick={() => { setSearch(""); setStatus(""); setFilterDari(""); setFilterSampai(""); }}>
            Reset Semua
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada proses produksi"
          description="Mulai catat proses pertama untuk melihat riwayatnya di sini."
          action={
            <Link href="/produksi/proses/baru">
              <Button>
                <Plus className="h-4 w-4" />
                Buat Proses Baru
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Nomor</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Nama</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Tanggal</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Outlet</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Status</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Bahan Baku</th>
                  <th className="whitespace-nowrap py-2 pr-4 text-right font-medium">Total Biaya</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/produksi/proses/${p.id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {p.nomor}
                      </Link>
                      <div className="text-xs text-gray-500 dark:text-gray-500">oleh {p.user.nama}</div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {p.nama ?? "-"}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {formatTanggal(p.tanggal)}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {p.outlet.nama}
                    </td>
                    <td className="py-3 pr-4">
                      {statusBadge(p.status)}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {p.jumlahBahanBaku} item
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right font-medium text-gray-900 dark:text-gray-50">
                      {formatRupiah(p.totalBiaya)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Output
// ---------------------------------------------------------------------------

function OutputTab() {
  const [data, setData] = React.useState<OutputRingkas[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterDari, setFilterDari] = React.useState("");
  const [filterSampai, setFilterSampai] = React.useState("");
  const [page, setPage] = React.useState(1);

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDari) params.set("dari", filterDari);
      if (filterSampai) params.set("sampai", filterSampai);
      const res = await fetch(`/api/produksi/output?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal memuat data output");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [filterDari, filterSampai]);

  React.useEffect(() => {
    muat();
  }, [muat]);

  React.useEffect(() => { setPage(1); }, [search, filterDari, filterSampai]);

  // Client-side search
  const filtered = React.useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (o) =>
        o.nomor.toLowerCase().includes(q) ||
        o.proses.some((p) => p.nomor.toLowerCase().includes(q) || (p.nama && p.nama.toLowerCase().includes(q))) ||
        o.produkJadi.some((op) => op.produkJadi.nama.toLowerCase().includes(q))
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nomor output / nomor proses / nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <Input type="date" label="Dari Tanggal" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} />
          <Input type="date" label="Sampai Tanggal" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} />
          <Button variant="ghost" onClick={() => { setSearch(""); setFilterDari(""); setFilterSampai(""); }}>
            Reset Semua
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada output produksi"
          description="Buat output dari proses yang sudah selesai untuk mencatat produk jadi."
          action={
            <Link href="/produksi/output/baru">
              <Button>
                <Plus className="h-4 w-4" />
                Buat Output Baru
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Nomor</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Tanggal</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Outlet</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Proses</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Output</th>
                  <th className="whitespace-nowrap py-2 pr-4 text-right font-medium">Total Biaya (HPP)</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/produksi/output/${o.id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {o.nomor}
                      </Link>
                      <div className="text-xs text-gray-500 dark:text-gray-500">oleh {o.user.nama}</div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {formatTanggal(o.tanggal)}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {o.outlet.nama}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {o.proses.map((p) => (
                          <span key={p.id} className="whitespace-nowrap text-xs">
                            {p.nomor}{p.nama ? ` (${p.nama})` : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {o.produkJadi.map((op) => (
                          <span key={op.id} className="whitespace-nowrap">
                            {op.produkJadi.nama} ×{op.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right font-medium text-gray-900 dark:text-gray-50">
                      {formatRupiah(o.totalBiaya)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Halaman utama dengan Tabs
// ---------------------------------------------------------------------------

export function ProduksiListClient() {
  return (
    <div>
      <PageHeader
        title="Proses Produksi"
        description="Kelola proses masak (bahan baku) dan output (produk jadi + kemasan) secara terpisah."
      />

      <Tabs defaultValue="proses">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="proses">
              <Beaker className="mr-1.5 h-4 w-4" /> Proses
            </TabsTrigger>
            <TabsTrigger value="output">
              <Package className="mr-1.5 h-4 w-4" /> Output
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="proses">
          <div className="mb-4">
            <Link href="/produksi/proses/baru">
              <Button size="lg">
                <Plus className="h-4 w-4" />
                Buat Proses Baru
              </Button>
            </Link>
          </div>
          <Card>
            <ProsesTab />
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <div className="mb-4">
            <Link href="/produksi/output/baru">
              <Button size="lg">
                <Plus className="h-4 w-4" />
                Buat Output Baru
              </Button>
            </Link>
          </div>
          <Card>
            <OutputTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
