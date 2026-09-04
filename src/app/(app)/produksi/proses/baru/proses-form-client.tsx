"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, Beaker } from "lucide-react";
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

interface OpsiOutlet {
  id: string;
  nama: string;
}

interface OpsiData {
  outlets: OpsiOutlet[];
  bahanBaku: OpsiItem[];
}

interface BahanBakuBaris {
  key: string;
  bahanBakuId: string | null;
  qtyPakai: string;
  qtyWaste: string;
  hargaSatuan: string;
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

// ---------------------------------------------------------------------------
// Komponen
// ---------------------------------------------------------------------------

export function ProsesFormClient() {
  const router = useRouter();
  const [opsi, setOpsi] = React.useState<OpsiData | null>(null);
  const [loadingOpsi, setLoadingOpsi] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [nama, setNama] = React.useState("");
  const [catatan, setCatatan] = React.useState("");

  const [bahanBaris, setBahanBaris] = React.useState<BahanBakuBaris[]>([
    { key: keyBaru(), bahanBakuId: null, qtyPakai: "", qtyWaste: "", hargaSatuan: "" },
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

  const outletOptions: SelectOption[] = (opsi?.outlets ?? []).map((o) => ({ value: o.id, label: o.nama }));
  const bahanBakuOptions: SelectOption[] = (opsi?.bahanBaku ?? []).map((b) => ({
    value: b.id,
    label: b.nama,
    hint: `Stok: ${formatAngka(b.stok, 3)} ${b.satuan}`,
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

  // -- hitung total biaya preview --
  const totalBiaya = React.useMemo(() => {
    return bahanBaris
      .filter((b) => b.bahanBakuId && num(b.qtyPakai) > 0)
      .reduce((sum, b) => sum + (num(b.qtyPakai) + num(b.qtyWaste)) * num(b.hargaSatuan), 0);
  }, [bahanBaris]);

  // -- validasi stok inline --
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
    return pesan;
  }, [bahanBaris, bahanBakuMap]);

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
    if (peringatanStok.length > 0) {
      toast.error(peringatanStok[0]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/produksi/proses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          nama: nama || undefined,
          catatan: catatan || undefined,
          bahanBaku: bahanValid.map((b) => ({
            bahanBakuId: b.bahanBakuId,
            qtyPakai: num(b.qtyPakai),
            qtyWaste: num(b.qtyWaste),
            hargaSatuanSaatItu: num(b.hargaSatuan),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal menyimpan proses");
        return;
      }
      toast.success(`Proses ${json.data.nomor} berhasil disimpan`);
      router.push(`/produksi/proses/${json.data.id}`);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOpsi) {
    return (
      <div>
        <PageHeader title="Buat Proses Baru" />
        <Card>
          <LoadingSkeleton rows={6} />
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="Buat Proses Baru" description="Input bahan baku yang dipakai untuk memasak. Stok bahan baku akan langsung dikurangi." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Proses</CardTitle>
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
            <Input
              label="Nama Label (opsional)"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Mis. Wajan 1, Adonan Cabai Pagi"
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
                  label={idx === 0 ? "Harga Satuan" : undefined}
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
            Harga satuan diinput manual per proses (tidak ada harga rata-rata berjalan pada Bahan Baku).
          </p>
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Biaya Bahan Baku</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{formatRupiah(totalBiaya)}</p>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/produksi")}>
            Batal
          </Button>
          <Button type="submit" size="lg" loading={submitting} disabled={peringatanStok.length > 0}>
            Simpan Proses
          </Button>
        </div>
      </form>
    </div>
  );
}
