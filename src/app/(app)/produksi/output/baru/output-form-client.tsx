"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Package, Boxes } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { LoadingSkeleton } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface OpsiOutlet { id: string; nama: string; }
interface OpsiItem { id: string; nama: string; satuan: string; stok: number; }
interface OpsiProdukJadi extends OpsiItem { beratBersih: number | null; harga: number; }
interface ProsesSelesai { id: string; nomor: string; nama: string | null; totalBiaya: number; }

interface OpsiData {
  outlets: OpsiOutlet[];
  kemasan: OpsiItem[];
  produkJadi: OpsiProdukJadi[];
  prosesSelesai: ProsesSelesai[];
}

interface OutputBaris {
  key: string;
  produkJadiId: string | null;
  qty: string;
}

interface KemasanBaris {
  key: string;
  kemasanId: string | null;
  qtyPakai: string;
  hargaSatuan: string;
}

let counter = 0;
function keyBaru() { counter += 1; return `baris-${counter}-${Date.now()}`; }
const num = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : 0; };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutputFormClient() {
  const router = useRouter();
  const [loadingOpsi, setLoadingOpsi] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Opsi data
  const [outlets, setOutlets] = React.useState<OpsiOutlet[]>([]);
  const [kemasanList, setKemasanList] = React.useState<OpsiItem[]>([]);
  const [produkJadiList, setProdukJadiList] = React.useState<OpsiProdukJadi[]>([]);
  const [prosesSelesai, setProsesSelesai] = React.useState<ProsesSelesai[]>([]);

  // Form state
  const [outletId, setOutletId] = React.useState<string>("");
  const [catatan, setCatatan] = React.useState("");
  const [selectedProsesIds, setSelectedProsesIds] = React.useState<string[]>([]);
  const [outputBaris, setOutputBaris] = React.useState<OutputBaris[]>([]);
  const [kemasanBaris, setKemasanBaris] = React.useState<KemasanBaris[]>([]);

  // Maps
  const produkJadiMap = React.useMemo(() => new Map(produkJadiList.map((p) => [p.id, p])), [produkJadiList]);
  const kemasanMap = React.useMemo(() => new Map(kemasanList.map((k) => [k.id, k])), [kemasanList]);
  const prosesMap = React.useMemo(() => new Map(prosesSelesai.map((p) => [p.id, p])), [prosesSelesai]);

  // Load options
  React.useEffect(() => {
    fetch("/api/produksi/opsi")
      .then((r) => r.json())
      .then((res) => {
        const d = res.data ?? res;
        setOutlets(d.outlets ?? []);
        setKemasanList(d.kemasan ?? []);
        setProdukJadiList(d.produkJadi ?? []);
        setProsesSelesai(d.prosesSelesai ?? []);
      })
      .catch(() => toast.error("Gagal memuat data opsi"))
      .finally(() => setLoadingOpsi(false));
  }, []);

  // Outlet options
  const outletOptions: SelectOption[] = React.useMemo(
    () => outlets.map((o) => ({ value: o.id, label: o.nama })),
    [outlets]
  );

  // Proses options (checkboxes)
  const prosesOptions = React.useMemo(
    () => prosesSelesai.map((p) => ({
      value: p.id,
      label: `${p.nomor}${p.nama ? ` — ${p.nama}` : ""} (${formatRupiah(p.totalBiaya)})`,
    })),
    [prosesSelesai]
  );

  // Total biaya dari proses terpilih
  const totalBiayaProses = React.useMemo(
    () => selectedProsesIds.reduce((sum, id) => sum + (prosesMap.get(id)?.totalBiaya ?? 0), 0),
    [selectedProsesIds, prosesMap]
  );

  // Total biaya kemasan
  const totalBiayaKemasan = React.useMemo(
    () => kemasanBaris.reduce((sum, k) => sum + num(k.qtyPakai) * num(k.hargaSatuan), 0),
    [kemasanBaris]
  );

  // HPP preview
  const hppPreview = React.useMemo(() => {
    const totalBiayaBatch = totalBiayaProses + totalBiayaKemasan;
    const outputValid = outputBaris.filter((o) => o.produkJadiId && num(o.qty) > 0);
    if (outputValid.length === 0) return null;

    const withBerat = outputValid.map((o) => {
      const p = produkJadiMap.get(o.produkJadiId!);
      const beratFallback = p?.beratBersih == null;
      const bobotSatuan = p?.beratBersih ?? 1;
      const totalBerat = bobotSatuan * num(o.qty);
      return { produkJadiId: o.produkJadiId!, nama: p?.nama ?? "?", qty: num(o.qty), totalBerat, beratFallback };
    });

    const totalBeratSemuaOutput = withBerat.reduce((sum, o) => sum + o.totalBerat, 0);
    const hppPerGram = totalBeratSemuaOutput > 0 ? totalBiayaBatch / totalBeratSemuaOutput : 0;

    return {
      totalBiayaBatch,
      totalBeratSemuaOutput,
      hppPerGram,
      output: withBerat.map((o) => ({
        ...o,
        hppAlokasi: hppPerGram * o.totalBerat,
        hppPerUnit: o.qty > 0 ? (hppPerGram * o.totalBerat) / o.qty : 0,
      })),
    };
  }, [totalBiayaProses, totalBiayaKemasan, outputBaris, produkJadiMap]);

  // Validasi stok kemasan
  const peringatanStok = React.useMemo(() => {
    const pesan: string[] = [];
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
  }, [kemasanBaris, kemasanMap]);

  // Toggle proses selection
  function toggleProses(id: string) {
    setSelectedProsesIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Output baris CRUD
  function tambahOutputBaris() { setOutputBaris((prev) => [...prev, { key: keyBaru(), produkJadiId: null, qty: "" }]); }
  function hapusOutputBaris(key: string) { setOutputBaris((prev) => prev.filter((o) => o.key !== key)); }
  function updateOutputBaris(key: string, patch: Partial<OutputBaris>) {
    setOutputBaris((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  }

  // Kemasan baris CRUD
  function tambahKemasanBaris() { setKemasanBaris((prev) => [...prev, { key: keyBaru(), kemasanId: null, qtyPakai: "", hargaSatuan: "" }]); }
  function hapusKemasanBaris(key: string) { setKemasanBaris((prev) => prev.filter((k) => k.key !== key)); }
  function updateKemasanBaris(key: string, patch: Partial<KemasanBaris>) {
    setKemasanBaris((prev) => prev.map((k) => (k.key === key ? { ...k, ...patch } : k)));
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outletId) { toast.error("Outlet wajib dipilih"); return; }
    if (selectedProsesIds.length === 0) { toast.error("Pilih minimal 1 Proses"); return; }
    const outputValid = outputBaris.filter((o) => o.produkJadiId);
    if (outputValid.length === 0) { toast.error("Minimal 1 output produk jadi harus diisi"); return; }
    for (const o of outputValid) {
      if (!(num(o.qty) > 0)) { toast.error("Qty output harus lebih dari 0"); return; }
    }
    const kemasanValid = kemasanBaris.filter((k) => k.kemasanId);
    for (const k of kemasanValid) {
      if (!(num(k.qtyPakai) > 0)) { toast.error("Qty pakai kemasan harus lebih dari 0"); return; }
      if (!(num(k.hargaSatuan) >= 0) || k.hargaSatuan === "") { toast.error("Harga satuan kemasan wajib diisi"); return; }
    }
    if (peringatanStok.length > 0) { toast.error(peringatanStok[0]); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/produksi/output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          catatan: catatan || undefined,
          prosesIds: selectedProsesIds,
          produkJadi: outputValid.map((o) => ({ produkJadiId: o.produkJadiId, qty: num(o.qty) })),
          kemasan: kemasanValid.map((k) => ({
            kemasanId: k.kemasanId,
            qtyPakai: num(k.qtyPakai),
            hargaSatuanSaatItu: num(k.hargaSatuan),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Gagal menyimpan output"); return; }
      toast.success(`Output ${json.data.nomor} berhasil disimpan`);
      router.push("/produksi");
    } catch { toast.error("Tidak bisa terhubung ke server"); }
    finally { setSubmitting(false); }
  }

  if (loadingOpsi) {
    return <div><PageHeader title="Buat Output Produksi" /><Card><LoadingSkeleton rows={6} /></Card></div>;
  }

  return (
    <div className="pb-24">
      <PageHeader title="Buat Output Produksi" description="Pilih Proses yang sudah selesai, lalu input produk jadi & kemasan." />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outlet & Catatan */}
        <Card>
          <CardHeader><CardTitle>Informasi Output</CardTitle></CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect label="Outlet" required placeholder="Pilih outlet" options={outletOptions} value={outletId} onChange={(v) => setOutletId(v ?? "")} />
            <Textarea label="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={1} placeholder="Mis. output sore" />
          </div>
        </Card>

        {/* Pilih Proses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4" /> Pilih Proses (Bahan Baku)
            </CardTitle>
          </CardHeader>
          {prosesSelesai.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada Proses berstatus Selesai. <a href="/produksi/proses/baru" className="text-blue-600 underline">Buat Proses dulu</a>.</p>
          ) : (
            <div className="space-y-2">
              {prosesOptions.map((p) => (
                <label key={p.value} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  <input type="checkbox" checked={selectedProsesIds.includes(p.value)} onChange={() => toggleProses(p.value)} className="h-4 w-4 rounded" />
                  <span className="text-sm text-gray-900 dark:text-gray-50">{p.label}</span>
                </label>
              ))}
              {selectedProsesIds.length > 0 && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total biaya {selectedProsesIds.length} proses: {formatRupiah(totalBiayaProses)}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Produk Jadi Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Produk Jadi Dihasilkan
            </CardTitle>
            <Button type="button" variant="secondary" size="lg" onClick={tambahOutputBaris}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </CardHeader>
          {outputBaris.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada produk ditambahkan.</p>
          ) : (
            <div className="space-y-3">
              {outputBaris.map((o) => {
                const options: SelectOption[] = produkJadiList.map((p) => ({ value: p.id, label: `${p.nama} (${p.satuan}) — stok: ${formatAngka(p.stok, 0)}` }));
                return (
                  <div key={o.key} className="grid gap-3 sm:grid-cols-[1fr_120px_40px] items-end">
                    <SearchableSelect label="Produk" options={options} value={o.produkJadiId ?? ""} onChange={(v) => updateOutputBaris(o.key, { produkJadiId: v })} placeholder="Pilih produk jadi" />
                    <Input label="Qty" type="number" min="0" step="any" value={o.qty} onChange={(e) => updateOutputBaris(o.key, { qty: e.target.value })} placeholder="0" />
                    <Button type="button" variant="danger" size="sm" onClick={() => hapusOutputBaris(o.key)} className="mb-0.5"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Kemasan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Kemasan Dipakai
            </CardTitle>
            <Button type="button" variant="secondary" size="lg" onClick={tambahKemasanBaris}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </CardHeader>
          {kemasanBaris.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Tidak wajib diisi kalau tidak pakai kemasan.</p>
          ) : (
            <div className="space-y-3">
              {kemasanBaris.map((k) => {
                const options: SelectOption[] = kemasanList.map((km) => ({ value: km.id, label: `${km.nama} (${km.satuan}) — stok: ${formatAngka(km.stok, 0)}` }));
                return (
                  <div key={k.key} className="grid gap-3 sm:grid-cols-[1fr_100px_120px_40px] items-end">
                    <SearchableSelect label="Kemasan" options={options} value={k.kemasanId ?? ""} onChange={(v) => updateKemasanBaris(k.key, { kemasanId: v })} placeholder="Pilih kemasan" />
                    <Input label="Qty Pakai" type="number" min="0" step="any" value={k.qtyPakai} onChange={(e) => updateKemasanBaris(k.key, { qtyPakai: e.target.value })} placeholder="0" />
                    <Input label="Harga Satuan" type="number" min="0" step="any" value={k.hargaSatuan} onChange={(e) => updateKemasanBaris(k.key, { hargaSatuan: e.target.value })} placeholder="0" />
                    <Button type="button" variant="danger" size="sm" onClick={() => hapusKemasanBaris(k.key)} className="mb-0.5"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Preview HPP */}
        {hppPreview && (
          <Card>
            <CardHeader><CardTitle>Preview HPP</CardTitle></CardHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-500">Total Biaya Batch</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(hppPreview.totalBiayaBatch)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-500">Total Berat Output</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{formatAngka(hppPreview.totalBeratSemuaOutput, 0)} gr</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-500">HPP per Gram</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">Rp {formatAngka(hppPreview.hppPerGram, 2)}</p>
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
                    {hppPreview.output.map((o) => (
                      <tr key={o.produkJadiId} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                        <td className="py-2 pr-4 text-gray-900 dark:text-gray-50">
                          {o.nama}
                          {o.beratFallback && <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">(fallback qty)</span>}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{formatAngka(o.qty, 0)}</td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{formatAngka(o.totalBerat, 0)} gr</td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{formatRupiah(o.hppAlokasi)}</td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(o.hppPerUnit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {/* Peringatan stok */}
        {peringatanStok.length > 0 && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950">
            {peringatanStok.map((p, i) => <p key={i} className="text-sm text-red-700 dark:text-red-300">{p}</p>)}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/produksi")}>Batal</Button>
          <Button type="submit" size="lg" loading={submitting} disabled={peringatanStok.length > 0}>Simpan Output</Button>
        </div>
      </form>
    </div>
  );
}
