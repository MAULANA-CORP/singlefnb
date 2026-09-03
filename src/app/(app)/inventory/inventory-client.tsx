"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, History, PackageSearch, SlidersHorizontal, Search } from "lucide-react";
import type { Role } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAngka, formatTanggalJam } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Konfigurasi kategori
// ---------------------------------------------------------------------------

type KategoriKey = "produk-jadi" | "bahan-baku" | "kemasan";

interface KategoriConfig {
  key: KategoriKey;
  label: string;
  labelItem: string;
  apiBase: string;
  roles: Role[];
}

const KATEGORI: KategoriConfig[] = [
  {
    key: "produk-jadi",
    label: "Produk Jadi",
    labelItem: "produk",
    apiBase: "/api/inventory/produk-jadi",
    roles: ["OWNER", "FINANCE", "SALES", "PRODUKSI"],
  },
  {
    key: "bahan-baku",
    label: "Bahan Baku",
    labelItem: "bahan baku",
    apiBase: "/api/inventory/bahan-baku",
    roles: ["OWNER", "FINANCE", "PRODUKSI"],
  },
  {
    key: "kemasan",
    label: "Kemasan",
    labelItem: "kemasan",
    apiBase: "/api/inventory/kemasan",
    roles: ["OWNER", "FINANCE", "PRODUKSI"],
  },
];

const SUMBER_OPTIONS: SelectOption[] = [
  { value: "PEMBELIAN", label: "Pembelian" },
  { value: "PRODUKSI_MASUK", label: "Produksi (Masuk)" },
  { value: "PRODUKSI_PAKAI", label: "Produksi (Pakai)" },
  { value: "PENJUALAN_POS", label: "Penjualan POS" },
  { value: "PENJUALAN_B2B", label: "Penjualan B2B" },
  { value: "ADJUSTMENT", label: "Penyesuaian Manual" },
  { value: "WASTE", label: "Waste" },
];

const TIPE_OPTIONS: SelectOption[] = [
  { value: "IN", label: "Masuk (IN)" },
  { value: "OUT", label: "Keluar (OUT)" },
];

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------

interface StokItem {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  stokMinimum: number;
  lowStock: boolean;
}

interface MovementItem {
  id: string;
  item: { id: string; nama: string; satuan: string };
  tipe: "IN" | "OUT";
  qty: number;
  sumber: string;
  referensiId: string | null;
  tanggal: string;
  keterangan: string | null;
}

const sumberLabel = (v: string) => SUMBER_OPTIONS.find((s) => s.value === v)?.label ?? v;

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export function InventoryClient({ role }: { role: Role }) {
  const kategoriTersedia = React.useMemo(() => KATEGORI.filter((k) => k.roles.includes(role)), [role]);
  const bisaAdjustment = role === "OWNER" || role === "PRODUKSI";

  const [activeKey, setActiveKey] = React.useState<KategoriKey>(kategoriTersedia[0]?.key ?? "produk-jadi");
  const activeKategori = kategoriTersedia.find((k) => k.key === activeKey) ?? kategoriTersedia[0];

  const [view, setView] = React.useState<"stok" | "riwayat">("stok");

  // -- data stok --
  const [stokData, setStokData] = React.useState<StokItem[] | null>(null);
  const [loadingStok, setLoadingStok] = React.useState(true);
  const [stokFilter, setStokFilter] = React.useState<string>("ALL");
  const [q, setQ] = React.useState("");

  const muatStok = React.useCallback(async () => {
    if (!activeKategori) return;
    setLoadingStok(true);
    try {
      const params = new URLSearchParams();
      if (stokFilter === "LOW") params.set("lowStock", "true");
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${activeKategori.apiBase}?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal memuat data stok");
        return;
      }
      setStokData(json.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoadingStok(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKategori?.apiBase, stokFilter, q]);

  React.useEffect(() => {
    if (view === "stok") muatStok();
  }, [view, muatStok]);

  // -- data riwayat --
  const [movementData, setMovementData] = React.useState<MovementItem[] | null>(null);
  const [loadingMovement, setLoadingMovement] = React.useState(true);
  const [filterItemId, setFilterItemId] = React.useState<string | null>(null);
  const [filterTipe, setFilterTipe] = React.useState<string | null>(null);
  const [filterSumber, setFilterSumber] = React.useState<string | null>(null);
  const [filterDari, setFilterDari] = React.useState("");
  const [filterSampai, setFilterSampai] = React.useState("");

  const muatMovement = React.useCallback(async () => {
    if (!activeKategori) return;
    setLoadingMovement(true);
    try {
      const params = new URLSearchParams();
      if (filterItemId) params.set("itemId", filterItemId);
      if (filterTipe) params.set("tipe", filterTipe);
      if (filterSumber) params.set("sumber", filterSumber);
      if (filterDari) params.set("dari", filterDari);
      if (filterSampai) params.set("sampai", filterSampai);
      const res = await fetch(`${activeKategori.apiBase}/movement?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal memuat riwayat pergerakan");
        return;
      }
      setMovementData(json.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoadingMovement(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKategori?.apiBase, filterItemId, filterTipe, filterSumber, filterDari, filterSampai]);

  React.useEffect(() => {
    if (view === "riwayat") muatMovement();
  }, [view, muatMovement]);

  function pindahKategori(key: KategoriKey) {
    setActiveKey(key);
    setQ("");
    setStokFilter("ALL");
  }

  // -- dialog penyesuaian stok --
  const [adjustTarget, setAdjustTarget] = React.useState<StokItem | null>(null);
  const [adjustTipe, setAdjustTipe] = React.useState<string | null>(null);
  const [adjustQty, setAdjustQty] = React.useState("");
  const [adjustAlasan, setAdjustAlasan] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [adjusting, setAdjusting] = React.useState(false);

  function bukaAdjustment(item: StokItem) {
    setAdjustTarget(item);
    setAdjustTipe(null);
    setAdjustQty("");
    setAdjustAlasan("");
  }

  function lanjutKonfirmasi() {
    if (!adjustTipe) {
      toast.error("Pilih tipe penyesuaian (Masuk/Keluar)");
      return;
    }
    const qty = Number(adjustQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Qty penyesuaian harus lebih dari 0");
      return;
    }
    if (!adjustAlasan.trim()) {
      toast.error("Alasan penyesuaian wajib diisi");
      return;
    }
    setConfirmOpen(true);
  }

  async function konfirmasiAdjustment() {
    if (!adjustTarget || !activeKategori) return;
    setAdjusting(true);
    try {
      const res = await fetch(`${activeKategori.apiBase}/adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: adjustTarget.id,
          tipe: adjustTipe,
          qty: Number(adjustQty),
          alasan: adjustAlasan.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal menyimpan penyesuaian stok");
        return;
      }
      toast.success(`Stok ${adjustTarget.nama} berhasil disesuaikan`);
      setConfirmOpen(false);
      setAdjustTarget(null);
      muatStok();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setAdjusting(false);
    }
  }

  const itemOptions: SelectOption[] = (stokData ?? []).map((i) => ({ value: i.id, label: i.nama }));

  if (!activeKategori) {
    return (
      <div>
        <PageHeader title="Inventory" />
        <EmptyState title="Tidak ada akses" description="Role Anda tidak punya akses ke modul Inventory." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Inventory" description="Stok berjalan & riwayat pergerakan Produk Jadi, Bahan Baku, dan Kemasan." />

      {/* Tab kategori */}
      <div className="mb-4 flex flex-wrap gap-2">
        {kategoriTersedia.map((k) => (
          <Button
            key={k.key}
            type="button"
            size="lg"
            variant={activeKey === k.key ? "primary" : "secondary"}
            onClick={() => pindahKategori(k.key)}
          >
            {k.label}
          </Button>
        ))}
      </div>

      {/* Tab sub-view */}
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "stok" ? "primary" : "secondary"}
          onClick={() => setView("stok")}
        >
          <PackageSearch className="h-3.5 w-3.5" /> Stok
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "riwayat" ? "primary" : "secondary"}
          onClick={() => setView("riwayat")}
        >
          <History className="h-3.5 w-3.5" /> Riwayat Pergerakan
        </Button>
      </div>

      {view === "stok" ? (
        <Card>
          <CardHeader>
            <CardTitle>Stok {activeKategori.label}</CardTitle>
          </CardHeader>

          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder={`Cari nama ${activeKategori?.label}...`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stokFilter} onValueChange={setStokFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-zinc-900">
                <SelectValue placeholder="Semua Stok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Stok</SelectItem>
                <SelectItem value="LOW">Stok Menipis Saja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingStok ? (
            <LoadingSkeleton rows={6} />
          ) : !stokData || stokData.length === 0 ? (
            <EmptyState title="Tidak ada data" description={`Belum ada data ${activeKategori.labelItem}.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                    <th className="py-2 pr-4 font-medium">Nama</th>
                    <th className="py-2 pr-4 text-right font-medium">Stok</th>
                    <th className="py-2 pr-4 text-right font-medium">ROP (Stok Min.)</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    {bisaAdjustment && <th className="py-2 pr-4 font-medium">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {stokData.map((i) => (
                    <tr key={i.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-50">{i.nama}</td>
                      <td className="py-3 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {formatAngka(i.stok, 3)} {i.satuan}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {formatAngka(i.stokMinimum, 3)} {i.satuan}
                      </td>
                      <td className="py-3 pr-4">
                        {i.lowStock ? (
                          <Badge tone="red">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Stok Menipis
                          </Badge>
                        ) : (
                          <Badge tone="green">Aman</Badge>
                        )}
                      </td>
                      {bisaAdjustment && (
                        <td className="py-3 pr-4">
                          <Button size="sm" variant="secondary" onClick={() => bukaAdjustment(i)}>
                            <SlidersHorizontal className="h-3.5 w-3.5" /> Adjustment
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pergerakan {activeKategori.label}</CardTitle>
          </CardHeader>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SearchableSelect
              label="Item"
              placeholder="Semua item"
              options={itemOptions}
              value={filterItemId}
              onChange={setFilterItemId}
            />
            <SearchableSelect
              label="Tipe"
              placeholder="Semua tipe"
              options={TIPE_OPTIONS}
              value={filterTipe}
              onChange={setFilterTipe}
            />
            <SearchableSelect
              label="Sumber"
              placeholder="Semua sumber"
              options={SUMBER_OPTIONS}
              value={filterSumber}
              onChange={setFilterSumber}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Dari" type="date" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} />
              <Input label="Sampai" type="date" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} />
            </div>
          </div>

          {(filterItemId || filterTipe || filterSumber || filterDari || filterSampai) && (
            <div className="mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterItemId(null);
                  setFilterTipe(null);
                  setFilterSumber(null);
                  setFilterDari("");
                  setFilterSampai("");
                }}
              >
                Reset Filter
              </Button>
            </div>
          )}

          {loadingMovement ? (
            <LoadingSkeleton rows={6} />
          ) : !movementData || movementData.length === 0 ? (
            <EmptyState title="Belum ada riwayat" description="Tidak ada pergerakan stok yang cocok dengan filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                    <th className="py-2 pr-4 font-medium">Tanggal</th>
                    <th className="py-2 pr-4 font-medium">Item</th>
                    <th className="py-2 pr-4 font-medium">Tipe</th>
                    <th className="py-2 pr-4 text-right font-medium">Qty</th>
                    <th className="py-2 pr-4 font-medium">Sumber</th>
                    <th className="py-2 pr-4 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {movementData.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                      <td className="whitespace-nowrap py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {formatTanggalJam(m.tanggal)}
                      </td>
                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-50">{m.item.nama}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={m.tipe === "IN" ? "green" : "amber"}>{m.tipe === "IN" ? "Masuk" : "Keluar"}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {formatAngka(m.qty, 3)} {m.item.satuan}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{sumberLabel(m.sumber)}</td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{m.keterangan ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Dialog form penyesuaian stok */}
      <Dialog
        open={!!adjustTarget}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
        title="Penyesuaian Stok Manual"
        description={adjustTarget ? `${adjustTarget.nama} — stok saat ini: ${formatAngka(adjustTarget.stok, 3)} ${adjustTarget.satuan}` : undefined}
      >
        <div className="space-y-4">
          <SearchableSelect
            label="Tipe Penyesuaian"
            required
            placeholder="Pilih tipe"
            options={TIPE_OPTIONS}
            value={adjustTipe}
            onChange={setAdjustTipe}
          />
          <Input
            label="Qty"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            required
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
            placeholder="0"
          />
          <Textarea
            label="Alasan Penyesuaian"
            required
            value={adjustAlasan}
            onChange={(e) => setAdjustAlasan(e.target.value)}
            placeholder="Mis. hasil stock opname, barang rusak, dsb"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdjustTarget(null)}>
              Batal
            </Button>
            <Button type="button" onClick={lanjutKonfirmasi}>
              Lanjutkan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Konfirmasi final sebelum menyimpan perubahan stok */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Konfirmasi Penyesuaian Stok"
        description={
          adjustTarget
            ? `${adjustTipe === "IN" ? "Menambah" : "Mengurangi"} stok ${adjustTarget.nama} sebanyak ${adjustQty || 0} ${adjustTarget.satuan}. Tindakan ini akan tercatat di riwayat pergerakan stok.`
            : undefined
        }
        confirmLabel="Ya, Simpan"
        onConfirm={konfirmasiAdjustment}
        loading={adjusting}
      />
    </div>
  );
}
