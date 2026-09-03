"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { formatRupiah } from "@/lib/utils";
import { SupplierCreateDialog } from "./supplier-create-dialog";
import { itemKosong } from "./types";
import type { ItemPembelianForm, OutletOption, StokItemOption, SupplierOption } from "./types";

let seqKey = 0;
function nextKey() {
  seqKey += 1;
  return `item-${seqKey}`;
}

export function PembelianForm({
  suppliers: suppliersAwal,
  bahanBaku,
  kemasan,
  outlets,
}: {
  suppliers: SupplierOption[];
  bahanBaku: StokItemOption[];
  kemasan: StokItemOption[];
  outlets: OutletOption[];
}) {
  const [suppliers, setSuppliers] = React.useState(suppliersAwal);
  const [supplierId, setSupplierId] = React.useState<string | null>(null);
  const [supplierDialogOpen, setSupplierDialogOpen] = React.useState(false);
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [tanggal, setTanggal] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [jatuhTempo, setJatuhTempo] = React.useState("");
  const [keterangan, setKeterangan] = React.useState("");
  const [items, setItems] = React.useState<ItemPembelianForm[]>([itemKosong(nextKey())]);
  const [saving, setSaving] = React.useState(false);

  const stokOptions: SelectOption[] = [
    ...bahanBaku.map((b) => ({ value: `bb:${b.id}`, label: b.nama, hint: `Bahan Baku · ${b.satuan}` })),
    ...kemasan.map((k) => ({ value: `km:${k.id}`, label: k.nama, hint: `Kemasan · ${k.satuan}` })),
  ];

  const supplierOptions: SelectOption[] = suppliers.map((s) => ({
    value: s.id,
    label: s.nama,
    hint: s.kontak ?? undefined,
  }));

  function updateItem(key: string, patch: Partial<ItemPembelianForm>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function setItemStok(key: string, value: string | null) {
    if (!value) {
      updateItem(key, { jenis: "", itemId: "" });
      return;
    }
    const [prefix, id] = value.split(":");
    updateItem(key, { jenis: prefix === "bb" ? "BAHAN_BAKU" : "KEMASAN", itemId: id });
  }

  function tambahItem() {
    setItems((prev) => [...prev, itemKosong(nextKey())]);
  }

  function hapusItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  const total = items.reduce((sum, it) => {
    const qty = Number(it.qty) || 0;
    const harga = Number(it.hargaSatuan) || 0;
    return sum + qty * harga;
  }, 0);

  function resetForm() {
    setSupplierId(null);
    setOutletId(null);
    setTanggal(new Date().toISOString().slice(0, 10));
    setJatuhTempo("");
    setKeterangan("");
    setItems([itemKosong(nextKey())]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      toast.error("Pilih supplier dulu");
      return;
    }
    if (!jatuhTempo) {
      toast.error("Tanggal jatuh tempo wajib diisi");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.itemId)) {
      toast.error("Setiap baris item harus pilih Bahan Baku/Kemasan");
      return;
    }
    if (items.some((it) => !(Number(it.qty) > 0))) {
      toast.error("Qty setiap item harus lebih dari 0");
      return;
    }
    if (items.some((it) => !(Number(it.hargaSatuan) >= 0))) {
      toast.error("Harga satuan tidak valid");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pembelian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          outletId: outletId || undefined,
          tanggal: tanggal ? new Date(tanggal).toISOString() : undefined,
          keterangan: keterangan.trim() || undefined,
          jatuhTempo: new Date(jatuhTempo).toISOString(),
          items: items.map((it) => ({
            bahanBakuId: it.jenis === "BAHAN_BAKU" ? it.itemId : null,
            kemasanId: it.jenis === "KEMASAN" ? it.itemId : null,
            qty: Number(it.qty),
            hargaSatuan: Number(it.hargaSatuan),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mencatat pembelian");
        return;
      }
      toast.success(`Pembelian ${data.data.nomor} tersimpan — stok bertambah, utang tercatat`);
      resetForm();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <SearchableSelect
            label="Supplier"
            required
            placeholder="Pilih supplier..."
            options={supplierOptions}
            value={supplierId}
            onChange={setSupplierId}
          />
          <button
            type="button"
            onClick={() => setSupplierDialogOpen(true)}
            className="mt-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            + Tambah supplier baru
          </button>
        </div>

        <SearchableSelect
          label="Outlet (opsional)"
          placeholder="Pilih outlet..."
          options={outlets.map((o) => ({ value: o.id, label: o.nama }))}
          value={outletId}
          onChange={setOutletId}
        />

        <Input
          label="Tanggal Pembelian"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
        />
        <Input
          label="Jatuh Tempo Pembayaran"
          type="date"
          required
          value={jatuhTempo}
          onChange={(e) => setJatuhTempo(e.target.value)}
        />
      </div>

      <Textarea
        label="Keterangan (opsional)"
        rows={2}
        value={keterangan}
        onChange={(e) => setKeterangan(e.target.value)}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Item Pembelian</p>
          <Button type="button" variant="secondary" size="sm" onClick={tambahItem}>
            <Plus className="h-4 w-4" />
            Tambah Item
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.key}
              className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end dark:border-zinc-700"
            >
              <SearchableSelect
                label="Bahan Baku / Kemasan"
                placeholder="Pilih item..."
                options={stokOptions}
                value={it.jenis ? `${it.jenis === "BAHAN_BAKU" ? "bb" : "km"}:${it.itemId}` : null}
                onChange={(v) => setItemStok(it.key, v)}
              />
              <Input
                label="Qty"
                type="number"
                min={0}
                step="0.001"
                value={it.qty}
                onChange={(e) => updateItem(it.key, { qty: e.target.value })}
              />
              <Input
                label="Harga Satuan"
                type="number"
                min={0}
                step="0.01"
                value={it.hargaSatuan}
                onChange={(e) => updateItem(it.key, { hargaSatuan: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => hapusItem(it.key)}
                disabled={items.length === 1}
                aria-label="Hapus item"
                className="h-11 w-11 shrink-0 justify-self-start text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-900">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pembelian</span>
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {formatRupiah(total)}
        </span>
      </div>

      <Button type="submit" loading={saving} className="w-full sm:w-auto">
        Simpan Pembelian
      </Button>

      <SupplierCreateDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(s) => {
          setSuppliers((prev) => [s, ...prev.filter((x) => x.id !== s.id)]);
          setSupplierId(s.id);
        }}
      />
    </form>
  );
}
