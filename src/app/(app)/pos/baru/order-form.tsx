"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { Dialog } from "@/components/ui/dialog";

import { formatRupiah } from "@/lib/utils";
import { METODE_BAYAR_OPTIONS, KREDIT_TIPE_OPTIONS } from "../_lib";

interface Produk {
  id: string;
  nama: string;
  satuan: string;
  harga: number;
  stok: number;
}

interface Customer {
  id: string;
  nama: string;
  kontak: string | null;
}

interface LineItem {
  key: string;
  produkJadiId: string;
  namaProduk: string;
  satuan: string;
  stokTersedia: number;
  qty: number;
  hargaSatuan: number;
}

export function OrderPOSForm() {
  const router = useRouter();

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [outlets, setOutlets] = React.useState<{ id: string; nama: string }[]>([]);
  const [produkList, setProdukList] = React.useState<Produk[]>([]);
  const [loadingMeta, setLoadingMeta] = React.useState(true);

  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [outletId, setOutletId] = React.useState<string | null>(outlets[0]?.id ?? null);
  const [items, setItems] = React.useState<LineItem[]>([]);
  const [pilihProduk, setPilihProduk] = React.useState<string | null>(null);
  const [metodeBayar, setMetodeBayar] = React.useState<string>("CASH");
  const [kreditTipe, setKreditTipe] = React.useState<string | null>(null);
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = React.useState("");
  const [bayarSekarang, setBayarSekarang] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Inline customer creation
  const [newCustomerOpen, setNewCustomerOpen] = React.useState(false);
  const [newCustomerNama, setNewCustomerNama] = React.useState("");
  const [newCustomerHP, setNewCustomerHP] = React.useState("");
  const [savingCustomer, setSavingCustomer] = React.useState(false);

  React.useEffect(() => {
    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [cRes, oRes, pRes] = await Promise.all([
          fetch("/api/database/customers"),
          fetch("/api/pos/outlets"),
          fetch("/api/pos/produk"),
        ]);
        const [cData, oData, pData] = await Promise.all([cRes.json(), oRes.json(), pRes.json()]);
        if (cRes.ok) setCustomers(cData.items ?? []);
        if (oRes.ok) {
          const list = oData.outlets ?? [];
          setOutlets(list);
          if (list.length > 0) setOutletId(list[0].id);
        }
        if (pRes.ok) setProdukList(pData.produk ?? []);
      } catch {
        toast.error("Gagal memuat data awal (customer/outlet/produk)");
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  const customerOptions: SelectOption[] = customers.map((c) => ({
    value: c.id,
    label: c.nama,
    hint: c.kontak ?? undefined,
  }));
  const outletOptions: SelectOption[] = outlets.map((o) => ({ value: o.id, label: o.nama }));
  const produkOptions: SelectOption[] = produkList.map((p) => ({
    value: p.id,
    label: p.nama,
    hint: `Stok ${p.stok} ${p.satuan} • ${formatRupiah(p.harga)}`,
    disabled: p.stok <= 0,
  }));

  // Handle "Entry Baru" customer
  function handleCreateCustomer(query: string) {
    setNewCustomerNama(query);
    setNewCustomerHP("");
    setNewCustomerOpen(true);
  }

  async function handleSaveNewCustomer() {
    if (!newCustomerNama.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/database/customers/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: newCustomerNama, noHP: newCustomerHP }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal membuat customer");
        return;
      }
      setCustomers((prev) => [data.data, ...prev]);
      setCustomerId(data.data.id);
      setNewCustomerOpen(false);
      toast.success(`Customer "${data.data.nama}" berhasil dibuat`);
    } catch {
      toast.error("Gagal membuat customer");
    } finally {
      setSavingCustomer(false);
    }
  }

  function tambahProduk(produkId: string | null) {
    if (!produkId) return;
    const produk = produkList.find((p) => p.id === produkId);
    if (!produk) return;

    setItems((prev) => {
      const existing = prev.find((it) => it.produkJadiId === produkId);
      if (existing) {
        return prev.map((it) =>
          it.produkJadiId === produkId ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [
        ...prev,
        {
          key: `${produkId}-${Date.now()}`,
          produkJadiId: produk.id,
          namaProduk: produk.nama,
          satuan: produk.satuan,
          stokTersedia: produk.stok,
          qty: 1,
          hargaSatuan: produk.harga,
        },
      ];
    });
    setPilihProduk(null);
  }

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.hargaSatuan, 0);
  const total = subtotal;

  async function handleSubmit() {
    if (!customerId) {
      toast.error("Pilih customer terlebih dahulu");
      return;
    }
    if (!outletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }
    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 produk");
      return;
    }
    for (const it of items) {
      if (it.qty <= 0) {
        toast.error(`Qty "${it.namaProduk}" harus lebih dari 0`);
        return;
      }
      if (it.qty > it.stokTersedia) {
        toast.error(`Stok "${it.namaProduk}" tidak cukup (tersedia ${it.stokTersedia})`);
        return;
      }
    }
    if (metodeBayar === "KREDIT") {
      if (!kreditTipe) {
        toast.error('Pilih "Langsung Lunas" atau "Parsial" untuk Kredit');
        return;
      }
      if (!tanggalJatuhTempo) {
        toast.error("Tanggal jatuh tempo wajib diisi untuk Kredit");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        customerId,
        outletId,
        items: items.map((it) => ({
          produkJadiId: it.produkJadiId,
          qty: it.qty,
          hargaSatuan: it.hargaSatuan,
        })),
        metodeBayar,
        kreditTipe: metodeBayar === "KREDIT" ? kreditTipe : undefined,
        tanggalJatuhTempo: metodeBayar === "KREDIT" ? tanggalJatuhTempo : undefined,
        bayarSekarang:
          metodeBayar === "KREDIT" && kreditTipe === "PARSIAL"
            ? Number(bayarSekarang || 0)
            : undefined,
        catatan: catatan.trim() || undefined,
      };

      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan order");
        return;
      }
      toast.success(`Order ${data.order.nomor} berhasil disimpan`);
      router.push(`/pos/${data.order.id}`);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Buat Order Baru"
        description="Order penjualan POS (retail) untuk konsumen akhir."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer &amp; Outlet</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchableSelect
              label="Customer"
              required
              placeholder={loadingMeta ? "Memuat..." : "Pilih / ketik nama baru..."}
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              disabled={loadingMeta}
              createText="Entry Baru Customer"
              onCreateNew={handleCreateCustomer}
            />
            <SearchableSelect
              label="Outlet"
              required
              placeholder={loadingMeta ? "Memuat..." : "Pilih outlet"}
              options={outletOptions}
              value={outletId}
              onChange={setOutletId}
              disabled={loadingMeta}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produk</CardTitle>
          </CardHeader>

          <SearchableSelect
            placeholder={loadingMeta ? "Memuat produk..." : "Tambah produk..."}
            searchPlaceholder="Cari produk..."
            emptyText="Produk tidak ditemukan"
            options={produkOptions}
            value={pilihProduk}
            onChange={tambahProduk}
            disabled={loadingMeta}
          />

          {items.length === 0 ? (
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
              Belum ada produk ditambahkan.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((it) => (
                <div
                  key={it.key}
                  className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-gray-50">{it.namaProduk}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Stok tersedia: {it.stokTersedia} {it.satuan}
                        {it.qty > it.stokTersedia && (
                          <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                            — melebihi stok!
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.key)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      aria-label={`Hapus ${it.namaProduk}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Qty"
                      type="number"
                      min={0}
                      step="0.001"
                      value={it.qty}
                      onChange={(e) => updateItem(it.key, { qty: Number(e.target.value) })}
                    />
                    <Input
                      label="Harga Satuan"
                      type="number"
                      min={0}
                      value={it.hargaSatuan}
                      onChange={(e) => updateItem(it.key, { hargaSatuan: Number(e.target.value) })}
                    />
                  </div>
                  <p className="mt-2 text-right text-sm font-medium text-gray-900 dark:text-gray-50">
                    Subtotal: {formatRupiah(it.qty * it.hargaSatuan)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <SearchableSelect
              label="Metode Bayar"
              required
              options={METODE_BAYAR_OPTIONS}
              value={metodeBayar}
              onChange={(v) => {
                setMetodeBayar(v ?? "CASH");
                if (v !== "KREDIT") {
                  setKreditTipe(null);
                  setTanggalJatuhTempo("");
                  setBayarSekarang("");
                }
              }}
            />

            {metodeBayar === "KREDIT" && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <SearchableSelect
                  label="Tipe Kredit"
                  required
                  options={KREDIT_TIPE_OPTIONS}
                  value={kreditTipe}
                  onChange={setKreditTipe}
                />
                <Input
                  label="Tanggal Jatuh Tempo"
                  type="date"
                  required
                  value={tanggalJatuhTempo}
                  onChange={(e) => setTanggalJatuhTempo(e.target.value)}
                />
                {kreditTipe === "PARSIAL" && (
                  <Input
                    label="Bayar Sekarang (opsional, uang muka)"
                    type="number"
                    min={0}
                    max={total}
                    value={bayarSekarang}
                    onChange={(e) => setBayarSekarang(e.target.value)}
                    placeholder="0"
                  />
                )}
              </div>
            )}

            <Textarea
              label="Catatan (opsional)"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
            />
          </div>
        </Card>
      </div>

      {/* Ringkasan total — sticky di bawah */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:sticky sm:mt-4 sm:rounded-xl sm:border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(total)}</p>
          </div>
          <Button size="lg" onClick={handleSubmit} loading={saving} disabled={loadingMeta}>
            <Plus className="h-4 w-4" />
            Simpan Order
          </Button>
        </div>
      </div>

      {/* Dialog Entry Baru Customer */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen} title="Customer Baru">
        <div className="space-y-4">
          <Input label="Nama Customer" required value={newCustomerNama} onChange={(e) => setNewCustomerNama(e.target.value)} />
          <Input label="No. HP / WhatsApp" value={newCustomerHP} onChange={(e) => setNewCustomerHP(e.target.value)} placeholder="08xxxxxxxxxx" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setNewCustomerOpen(false)}>Batal</Button>
            <Button type="button" loading={savingCustomer} onClick={handleSaveNewCustomer}>Simpan</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
