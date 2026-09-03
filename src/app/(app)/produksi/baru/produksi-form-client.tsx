"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, Beaker, Package, Boxes } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipe & util lokal
// ---------------------------------------------------------------------------

interface OpsiItem {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
}

interface OpsiProdukJadi extends OpsiItem {
  beratBersih: number | null;
}

interface OpsiOutlet {
  id: string;
  nama: string;
}

interface OpsiData {
  outlets: OpsiOutlet[];
  bahanBaku: OpsiItem[];
  kemasan: OpsiItem[];
  produkJadi: OpsiProdukJadi[];
}

interface BahanBakuBaris {
  key: string;
  bahanBakuId: string | null;
  qtyPakai: string;
  qtyWaste: string;
  hargaSatuan: string;
}

interface KemasanBaris {
  key: string;
  kemasanId: string | null;
  qtyPakai: string;
  hargaSatuan: string;
}

interface OutputBaris {
  key: string;
  produkJadiId: string | null;
  qty: string;
}

let counter = 0;
function keyBaru() {
  counter += 1;
  return `baris-${counter}-${Date.now()}`;
}

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Preview HPP di sisi client — mirror PERSIS rumus di src/lib/produksi.ts (hitungAlokasiHPP).
 * Sengaja diduplikasi (bukan import) karena lib/produksi.ts memuat kode server-only (Prisma/pg)
 * yang tidak boleh masuk bundle client. Sumber kebenaran tetap fungsi server; ini hanya pratinjau.
 */
function hitungPreview(
  bahanBaku: { qtyPakai: number; qtyWaste: number; hargaSatuan: number }[],
  kemasan: { qtyPakai: number; hargaSatuan: number }[],
  output: { produkJadiId: string; nama: string; qty: number; beratBersih: number | null }[]
) {
  const totalBiayaBahanBaku = bahanBaku.reduce((s, b) => s + (b.qtyPakai + b.qtyWaste) * b.hargaSatuan, 0);
  const totalBiayaKemasan = kemasan.reduce((s, k) => s + k.qtyPakai * k.hargaSatuan, 0);
  const totalBiayaBatch = totalBiayaBahanBaku + totalBiayaKemasan;

  const withBerat = output.map((o) => {
    const beratFallback = o.beratBersih == null;
    const totalBerat = (o.beratBersih ?? 1) * o.qty;
    return { ...o, totalBerat, beratFallback };
  });
  const totalBeratSemuaOutput = withBerat.reduce((s, o) => s + o.totalBerat, 0);
  const hppPerGram = totalBeratSemuaOutput > 0 ? totalBiayaBatch / totalBeratSemuaOutput : 0;

  const hasil = withBerat.map((o) => {
    const hppAlokasi = hppPerGram * o.totalBerat;
    return {
      produkJadiId: o.produkJadiId,
      nama: o.nama,
      qty: o.qty,
      totalBerat: o.totalBerat,
      beratFallback: o.beratFallback,
      hppAlokasi,
      hppPerUnit: o.qty > 0 ? hppAlokasi / o.qty : 0,
    };
  });

  return { totalBiayaBatch, totalBeratSemuaOutput, hppPerGram, output: hasil };
}

// ---------------------------------------------------------------------------
// Komponen
// ---------------------------------------------------------------------------

export function ProduksiFormClient() {
  const router = useRouter();
  const [opsi, setOpsi] = React.useState<OpsiData | null>(null);
  const [loadingOpsi, setLoadingOpsi] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [catatan, setCatatan] = React.useState("");

  const [bahanBaris, setBahanBaris] = React.useState<BahanBakuBaris[]>([
    { key: keyBaru(), bahanBakuId: null, qtyPakai: "", qtyWaste: "", hargaSatuan: "" },
  ]);
  const [kemasanBaris, setKemasanBaris] = React.useState<KemasanBaris[]>([]);
  const [outputBaris, setOutputBaris] = React.useState<OutputBaris[]>([
    { key: keyBaru(), produkJadiId: null, qty: "" },
  ]);

  React.useEffect(() => {
    (async () => {
      setLoadingOpsi(true);
      try {
        const res = await fetch("/api/produksi/opsi");
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Gagal memuat data pilihan");
          return;
        }
        setOpsi(json.data);
        if (json.data.outlets.length === 1) setOutletId(json.data.outlets[0].id);
      } catch {
        toast.error("Tidak bisa terhubung ke server");
      } finally {
        setLoadingOpsi(false);
      }
    })();
  }, []);

  const bahanBakuMap = React.useMemo(
    () => new Map((opsi?.bahanBaku ?? []).map((b) => [b.id, b])),
    [opsi]
  );
  const kemasanMap = React.useMemo(() => new Map((opsi?.kemasan ?? []).map((k) => [k.id, k])), [opsi]);
  const produkJadiMap = React.useMemo(
    () => new Map((opsi?.produkJadi ?? []).map((p) => [p.id, p])),
    [opsi]
  );

  const outletOptions: SelectOption[] = (opsi?.outlets ?? []).map((o) => ({ value: o.id, label: o.nama }));
  const bahanBakuOptions: SelectOption[] = (opsi?.bahanBaku ?? []).map((b) => ({
    value: b.id,
    label: b.nama,
    hint: `Stok: ${formatAngka(b.stok, 3)} ${b.satuan}`,
  }));
  const kemasanOptions: SelectOption[] = (opsi?.kemasan ?? []).map((k) => ({
    value: k.id,
    label: k.nama,
    hint: `Stok: ${formatAngka(k.stok, 3)} ${k.satuan}`,
  }));
  const produkJadiOptions: SelectOption[] = (opsi?.produkJadi ?? []).map((p) => ({
    value: p.id,
    label: p.nama,
    hint: p.beratBersih != null ? `Berat bersih: ${p.beratBersih}gr` : "Belum ada berat bersih",
  }));

  // -- baris bahan baku --
  function tambahBahanBaris() {
    setBahanBaris((prev) => [...prev, { key: keyBaru(), bahanBakuId: null, qtyPakai: "", qtyWaste: "", hargaSatuan: "" }]);
  }
  function hapusBahanBaris(key: string) {
    setBahanBaris((prev) => prev.filter((b) => b.key !== key));
  }
  function updateBahanBaris(key: string, patch: Partial<BahanBakuBaris>) {
    setBahanBaris((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  // -- baris kemasan --
  function tambahKemasanBaris() {
    setKemasanBaris((prev) => [...prev, { key: keyBaru(), kemasanId: null, qtyPakai: "", hargaSatuan: "" }]);
  }
  function hapusKemasanBaris(key: string) {
    setKemasanBaris((prev) => prev.filter((k) => k.key !== key));
  }
  function updateKemasanBaris(key: string, patch: Partial<KemasanBaris>) {
    setKemasanBaris((prev) => prev.map((k) => (k.key === key ? { ...k, ...patch } : k)));
  }

  // -- baris output --
  function tambahOutputBaris() {
    setOutputBaris((prev) => [...prev, { key: keyBaru(), produkJadiId: null, qty: "" }]);
  }
  function hapusOutputBaris(key: string) {
    setOutputBaris((prev) => prev.filter((o) => o.key !== key));
  }
  function updateOutputBaris(key: string, patch: Partial<OutputBaris>) {
    setOutputBaris((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  }

  // -- live preview --
  const preview = React.useMemo(() => {
    const bahanValid = bahanBaris.filter((b) => b.bahanBakuId && num(b.qtyPakai) > 0);
    const kemasanValid = kemasanBaris.filter((k) => k.kemasanId && num(k.qtyPakai) > 0);
    const outputValid = outputBaris.filter((o) => o.produkJadiId && num(o.qty) > 0);

    if (outputValid.length === 0) return null;

    return hitungPreview(
      bahanValid.map((b) => ({ qtyPakai: num(b.qtyPakai), qtyWaste: num(b.qtyWaste), hargaSatuan: num(b.hargaSatuan) })),
      kemasanValid.map((k) => ({ qtyPakai: num(k.qtyPakai), hargaSatuan: num(k.hargaSatuan) })),
      outputValid.map((o) => {
        const p = produkJadiMap.get(o.produkJadiId!);
        return {
          produkJadiId: o.produkJadiId!,
          nama: p?.nama ?? "?",
          qty: num(o.qty),
          beratBersih: p?.beratBersih ?? null,
        };
      })
    );
  }, [bahanBaris, kemasanBaris, outputBaris, produkJadiMap]);

  // -- validasi stok inline (peringatan sebelum submit) --
  const peringatanStok = React.useMemo(() => {
    const pesan: string[] = [];
    const kebutuhanBahan = new Map<string, number>();
    for (const b of bahanBaris) {
      if (!b.bahanBakuId) continue;
      const butuh = num(b.qtyPakai) + num(b.qtyWaste);
      kebutuhanBahan.set(b.bahanBakuId, (kebutuhanBahan.get(b.bahanBakuId) ?? 0) + butuh);
    }
    for (const [id, butuh] of kebutuhanBahan) {
      const bb = bahanBakuMap.get(id);
      if (bb && butuh > bb.stok) {
        pesan.push(`Stok ${bb.nama} tidak cukup: tersedia ${formatAngka(bb.stok, 3)} ${bb.satuan}, dibutuhkan ${formatAngka(butuh, 3)} ${bb.satuan}.`);
      }
    }
    const kebutuhanKemasan = new Map<string, number>();
    for (const k of kemasanBaris) {
      if (!k.kemasanId) continue;
      kebutuhanKemasan.set(k.kemasanId, (kebutuhanKemasan.get(k.kemasanId) ?? 0) + num(k.qtyPakai));
    }
    for (const [id, butuh] of kebutuhanKemasan) {
      const k = kemasanMap.get(id);
      if (k && butuh > k.stok) {
        pesan.push(`Stok kemasan ${k.nama} tidak cukup: tersedia ${formatAngka(k.stok, 3)} ${k.satuan}, dibutuhkan ${formatAngka(butuh, 3)} ${k.satuan}.`);
      }
    }
    return pesan;
  }, [bahanBaris, kemasanBaris, bahanBakuMap, kemasanMap]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!outletId) {
      toast.error("Outlet wajib dipilih");
      return;
    }
    const bahanValid = bahanBaris.filter((b) => b.bahanBakuId);
    if (bahanValid.length === 0) {
      toast.error("Minimal 1 bahan baku harus diisi");
      return;
    }
    for (const b of bahanValid) {
      if (!(num(b.qtyPakai) > 0)) {
        toast.error("Qty pakai bahan baku harus lebih dari 0");
        return;
      }
      if (!(num(b.hargaSatuan) >= 0) || b.hargaSatuan === "") {
        toast.error("Harga satuan bahan baku wajib diisi");
        return;
      }
    }
    const kemasanValid = kemasanBaris.filter((k) => k.kemasanId);
    for (const k of kemasanValid) {
      if (!(num(k.qtyPakai) > 0)) {
        toast.error("Qty pakai kemasan harus lebih dari 0");
        return;
      }
      if (!(num(k.hargaSatuan) >= 0) || k.hargaSatuan === "") {
        toast.error("Harga satuan kemasan wajib diisi");
        return;
      }
    }
    const outputValid = outputBaris.filter((o) => o.produkJadiId);
    if (outputValid.length === 0) {
      toast.error("Minimal 1 output produk jadi harus diisi");
      return;
    }
    for (const o of outputValid) {
      if (!(num(o.qty) > 0)) {
        toast.error("Qty output harus lebih dari 0");
        return;
      }
    }
    if (peringatanStok.length > 0) {
      toast.error(peringatanStok[0]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/produksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          catatan: catatan || undefined,
          bahanBaku: bahanValid.map((b) => ({
            bahanBakuId: b.bahanBakuId,
            qtyPakai: num(b.qtyPakai),
            qtyWaste: num(b.qtyWaste),
            hargaSatuanSaatItu: num(b.hargaSatuan),
          })),
          kemasan: kemasanValid.map((k) => ({
            kemasanId: k.kemasanId,
            qtyPakai: num(k.qtyPakai),
            hargaSatuanSaatItu: num(k.hargaSatuan),
          })),
          output: outputValid.map((o) => ({ produkJadiId: o.produkJadiId, qty: num(o.qty) })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal menyimpan batch produksi");
        return;
      }
      toast.success(`Batch ${json.data.nomor} berhasil disimpan`);
      router.push(`/produksi/${json.data.id}`);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOpsi) {
    return (
      <div>
        <PageHeader title="Buat Batch Produksi" />
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Buat Batch Produksi" description="Input manual per batch — tanpa resep/BOM tetap." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Batch</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Outlet"
              required
              placeholder="Pilih outlet"
              options={outletOptions}
              value={outletId}
              onChange={setOutletId}
            />
            <Textarea
              label="Catatan (opsional)"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={1}
              placeholder="Mis. batch pagi, dsb"
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-4 w-4" /> Bahan Baku Dipakai
            </CardTitle>
            <Button type="button" variant="secondary" size="lg" onClick={tambahBahanBaris}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {bahanBaris.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-500">Belum ada baris bahan baku.</p>
            )}
            {bahanBaris.map((b, idx) => (
              <div
                key={b.key}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 dark:border-zinc-700 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
              >
                <SearchableSelect
                  label={idx === 0 ? "Bahan Baku" : undefined}
                  placeholder="Pilih bahan baku"
                  options={bahanBakuOptions}
                  value={b.bahanBakuId}
                  onChange={(v) => updateBahanBaris(b.key, { bahanBakuId: v })}
                />
                <Input
                  label={idx === 0 ? "Qty Pakai" : undefined}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={b.qtyPakai}
                  onChange={(e) => updateBahanBaris(b.key, { qtyPakai: e.target.value })}
                  placeholder="0"
                />
                <Input
                  label={idx === 0 ? "Waste (opsional)" : undefined}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={b.qtyWaste}
                  onChange={(e) => updateBahanBaris(b.key, { qtyWaste: e.target.value })}
                  placeholder="0"
                />
                <Input
                  label={idx === 0 ? "Harga Satuan Saat Ini" : undefined}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={b.hargaSatuan}
                  onChange={(e) => updateBahanBaris(b.key, { hargaSatuan: e.target.value })}
                  placeholder="Rp"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => hapusBahanBaris(b.key)}
                  aria-label="Hapus baris"
                >
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Harga satuan diinput manual per batch (tidak ada harga rata-rata berjalan pada Bahan Baku).
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4" /> Kemasan Dipakai
            </CardTitle>
            <Button type="button" variant="secondary" size="lg" onClick={tambahKemasanBaris}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {kemasanBaris.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-500">Belum ada kemasan ditambahkan (opsional).</p>
            )}
            {kemasanBaris.map((k, idx) => (
              <div
                key={k.key}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 dark:border-zinc-700 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
              >
                <SearchableSelect
                  label={idx === 0 ? "Kemasan" : undefined}
                  placeholder="Pilih kemasan"
                  options={kemasanOptions}
                  value={k.kemasanId}
                  onChange={(v) => updateKemasanBaris(k.key, { kemasanId: v })}
                />
                <Input
                  label={idx === 0 ? "Qty Pakai" : undefined}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={k.qtyPakai}
                  onChange={(e) => updateKemasanBaris(k.key, { qtyPakai: e.target.value })}
                  placeholder="0"
                />
                <Input
                  label={idx === 0 ? "Harga Satuan Saat Ini" : undefined}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={k.hargaSatuan}
                  onChange={(e) => updateKemasanBaris(k.key, { hargaSatuan: e.target.value })}
                  placeholder="Rp"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => hapusKemasanBaris(k.key)}
                  aria-label="Hapus baris"
                >
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Output Produk Jadi
            </CardTitle>
            <Button type="button" variant="secondary" size="lg" onClick={tambahOutputBaris}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {outputBaris.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-500">Belum ada baris output.</p>
            )}
            {outputBaris.map((o, idx) => {
              const produk = o.produkJadiId ? produkJadiMap.get(o.produkJadiId) : null;
              return (
                <div key={o.key} className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                    <SearchableSelect
                      label={idx === 0 ? "Produk Jadi" : undefined}
                      placeholder="Pilih produk jadi"
                      options={produkJadiOptions}
                      value={o.produkJadiId}
                      onChange={(v) => updateOutputBaris(o.key, { produkJadiId: v })}
                    />
                    <Input
                      label={idx === 0 ? "Qty Dihasilkan" : undefined}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={o.qty}
                      onChange={(e) => updateOutputBaris(o.key, { qty: e.target.value })}
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      onClick={() => hapusOutputBaris(o.key)}
                      aria-label="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                  {produk && produk.beratBersih == null && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Produk ini belum punya berat bersih — alokasi HPP pakai qty sebagai proxy berat (kurang akurat).
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {peringatanStok.length > 0 && (
          <Card className="border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-1 text-sm text-red-800 dark:text-red-300">
                {peringatanStok.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pratinjau Alokasi HPP</CardTitle>
          </CardHeader>
          {!preview ? (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Isi minimal 1 bahan baku (dengan harga) dan 1 output produk untuk melihat pratinjau HPP.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-500">Total Biaya Batch</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(preview.totalBiayaBatch)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-500">Total Berat Semua Output</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatAngka(preview.totalBeratSemuaOutput, 0)} gr
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-500">HPP per Gram</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">
                    Rp {formatAngka(preview.hppPerGram, 2)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                      <th className="py-2 pr-4 font-medium">Produk</th>
                      <th className="py-2 pr-4 text-right font-medium">Qty</th>
                      <th className="py-2 pr-4 text-right font-medium">Total Berat</th>
                      <th className="py-2 pr-4 text-right font-medium">Alokasi Biaya</th>
                      <th className="py-2 pr-4 text-right font-medium">HPP/Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.output.map((o) => (
                      <tr key={o.produkJadiId} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                        <td className="py-2 pr-4 text-gray-900 dark:text-gray-50">
                          {o.nama}
                          {o.beratFallback && (
                            <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">(fallback qty)</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">
                          {formatAngka(o.qty, 0)}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">
                          {formatAngka(o.totalBerat, 0)} gr
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">
                          {formatRupiah(o.hppAlokasi)}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-900 dark:text-gray-50">
                          {formatRupiah(o.hppPerUnit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/produksi")}>
            Batal
          </Button>
          <Button type="submit" size="lg" loading={submitting} disabled={peringatanStok.length > 0}>
            Simpan Batch
          </Button>
        </div>
      </form>
    </div>
  );
}
