"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { Dialog } from "@/components/ui/dialog";
import { formatRupiah, formatAngka } from "@/lib/utils";

interface AgenOpt {
  id: string;
  nama: string;
  kontak: string | null;
  noHP: string | null;
  alamat: string | null;
}
interface OutletOpt {
  id: string;
  nama: string;
}
interface ProdukOpt {
  id: string;
  nama: string;
  satuan: string;
  harga: number;
  stok: number;
}

interface Row {
  key: string;
  produkJadiId: string;
  qty: string;
  hargaSatuan: string;
}

function baris(): Row {
  return { key: Math.random().toString(36).slice(2), produkJadiId: "", qty: "1", hargaSatuan: "" };
}

export function OrderFormClient({
  defaultOutletId,
  agenList,
  outletList,
  produkList,
}: {
  defaultOutletId: string | null;
  agenList: AgenOpt[];
  outletList: OutletOpt[];
  produkList: ProdukOpt[];
}) {
  const router = useRouter();
  const [agens, setAgens] = React.useState(agenList);
  const [agenId, setAgenId] = React.useState<string | null>(null);
  const [outletId, setOutletId] = React.useState<string | null>(defaultOutletId ?? outletList[0]?.id ?? null);
  const [rows, setRows] = React.useState<Row[]>([baris()]);
  const [catatan, setCatatan] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Inline agen creation
  const [newAgenOpen, setNewAgenOpen] = React.useState(false);
  const [newAgenNama, setNewAgenNama] = React.useState("");
  const [newAgenHP, setNewAgenHP] = React.useState("");
  const [newAgenAlamat, setNewAgenAlamat] = React.useState("");
  const [savingAgen, setSavingAgen] = React.useState(false);

  const agenOptions: SelectOption[] = agens.map((a) => ({ value: a.id, label: a.nama, hint: a.noHP ?? a.kontak ?? undefined }));

  // Handle "Entry Baru" agen
  function handleCreateAgen(query: string) {
    setNewAgenNama(query);
    setNewAgenHP("");
    setNewAgenAlamat("");
    setNewAgenOpen(true);
  }

  async function handleSaveNewAgen() {
    if (!newAgenNama.trim()) {
      toast.error("Nama agen wajib diisi");
      return;
    }
    setSavingAgen(true);
    try {
      const res = await fetch("/api/database/agens/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: newAgenNama, noHP: newAgenHP, alamat: newAgenAlamat }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal membuat agen");
        return;
      }
      setAgens((prev) => [data.data, ...prev]);
      setAgenId(data.data.id);
      setNewAgenOpen(false);
      toast.success(`Agen "${data.data.nama}" berhasil dibuat`);
    } catch {
      toast.error("Gagal membuat agen");
    } finally {
      setSavingAgen(false);
    }
  }
  const outletOptions: SelectOption[] = outletList.map((o) => ({ value: o.id, label: o.nama }));
  const produkMap = React.useMemo(() => new Map(produkList.map((p) => [p.id, p])), [produkList]);

  function produkOptionsFor(rowKey: string): SelectOption[] {
    const dipakai = new Set(rows.filter((r) => r.key !== rowKey).map((r) => r.produkJadiId));
    return produkList.map((p) => ({
      value: p.id,
      label: p.nama,
      hint: `Stok ${formatAngka(p.stok)} ${p.satuan} · ${formatRupiah(p.harga)}`,
      disabled: dipakai.has(p.id) || p.stok <= 0,
    }));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pilihProduk(key: string, produkJadiId: string | null) {
    const produk = produkJadiId ? produkMap.get(produkJadiId) : undefined;
    updateRow(key, {
      produkJadiId: produkJadiId ?? "",
      hargaSatuan: produk ? String(produk.harga) : "",
    });
  }

  function tambahBaris() {
    setRows((prev) => [...prev, baris()]);
  }

  function hapusBaris(key: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const rincian = rows.map((r) => {
    const produk = produkMap.get(r.produkJadiId);
    const qty = Number(r.qty) || 0;
    const harga = Number(r.hargaSatuan) || 0;
    const subtotal = qty * harga;
    const stokKurang = produk ? qty > produk.stok : false;
    return { row: r, produk, qty, harga, subtotal, stokKurang };
  });
  const total = rincian.reduce((s, r) => s + r.subtotal, 0);
  const adaStokKurang = rincian.some((r) => r.stokKurang);
  const adaItemBelumLengkap = rincian.some((r) => !r.row.produkJadiId || r.qty <= 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agenId) {
      toast.error("Pilih Agen terlebih dahulu");
      return;
    }
    if (!outletId) {
      toast.error("Pilih Outlet terlebih dahulu");
      return;
    }
    if (adaItemBelumLengkap) {
      toast.error("Lengkapi semua item produk (produk & qty)");
      return;
    }
    if (adaStokKurang) {
      toast.error("Ada produk dengan qty melebihi stok tersedia");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/b2b/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agenId,
          outletId,
          catatan,
          items: rincian.map((r) => ({
            produkJadiId: r.row.produkJadiId,
            qty: r.qty,
            hargaSatuan: r.harga,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal membuat order");
        return;
      }
      toast.success(`Order ${data.data.nomor} berhasil dibuat`);
      router.push(`/b2b/${data.data.id}`);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Buat Order B2B" description="Order untuk Agen/Distributor. Stok akan tervalidasi & langsung berkurang saat disimpan." />

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Agen & Outlet</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Agen"
              required
              placeholder="Pilih / ketik nama baru..."
              searchPlaceholder="Cari agen..."
              emptyText="Agen tidak ditemukan"
              options={agenOptions}
              value={agenId}
              onChange={setAgenId}
              createText="Entry Baru Agen"
              onCreateNew={handleCreateAgen}
            />
            <SearchableSelect
              label="Outlet"
              required
              placeholder="Pilih outlet..."
              searchPlaceholder="Cari outlet..."
              emptyText="Outlet tidak ditemukan"
              options={outletOptions}
              value={outletId}
              onChange={setOutletId}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Item Produk</CardTitle>
          </CardHeader>

          <div className="space-y-3">
            {rows.map((r) => {
              const info = rincian.find((x) => x.row.key === r.key)!;
              return (
                <div
                  key={r.key}
                  className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px_140px_auto]">
                    <SearchableSelect
                      label="Produk"
                      placeholder="Pilih produk..."
                      searchPlaceholder="Cari produk..."
                      emptyText="Produk tidak ditemukan"
                      options={produkOptionsFor(r.key)}
                      value={r.produkJadiId || null}
                      onChange={(v) => pilihProduk(r.key, v)}
                    />
                    <Input
                      label="Qty"
                      type="number"
                      min={0}
                      step="0.001"
                      value={r.qty}
                      onChange={(e) => updateRow(r.key, { qty: e.target.value })}
                    />
                    <Input
                      label="Harga Satuan"
                      type="number"
                      min={0}
                      value={r.hargaSatuan}
                      onChange={(e) => updateRow(r.key, { hargaSatuan: e.target.value })}
                    />
                    <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {formatRupiah(info.subtotal)}
                      </p>
                      <button
                        type="button"
                        onClick={() => hapusBaris(r.key)}
                        disabled={rows.length === 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/30"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {info.stokKurang && (
                    <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      Stok tidak cukup — tersedia {formatAngka(info.produk?.stok ?? 0)} {info.produk?.satuan}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={tambahBaris}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-600 dark:text-gray-300 dark:hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Item
          </button>

          <div className="mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-zinc-700">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(total)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <Textarea
            label="Catatan (opsional)"
            placeholder="Catatan tambahan untuk order ini..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
          />
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" loading={submitting} disabled={adaStokKurang}>
            Simpan Order
          </Button>
        </div>
      </form>

      {/* Dialog Entry Baru Agen */}
      <Dialog open={newAgenOpen} onOpenChange={setNewAgenOpen} title="Agen Baru">
        <div className="space-y-4">
          <Input label="Nama Agen" required value={newAgenNama} onChange={(e) => setNewAgenNama(e.target.value)} />
          <Input label="No. HP / WhatsApp" value={newAgenHP} onChange={(e) => setNewAgenHP(e.target.value)} placeholder="08xxxxxxxxxx" />
          <Input label="Alamat" value={newAgenAlamat} onChange={(e) => setNewAgenAlamat(e.target.value)} placeholder="Kota / alamat agen" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setNewAgenOpen(false)}>Batal</Button>
            <Button type="button" loading={savingAgen} onClick={handleSaveNewAgen}>Simpan</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
