"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

const SUMBER_OPTIONS = [
  { value: "PINJAMAN", label: "Pinjaman" },
  { value: "INVESTOR", label: "Investor" },
];

export function UtangStandaloneForm() {
  const [sumber, setSumber] = React.useState<string | null>(null);
  const [pihakNama, setPihakNama] = React.useState("");
  const [jumlah, setJumlah] = React.useState("");
  const [jatuhTempo, setJatuhTempo] = React.useState("");
  const [keterangan, setKeterangan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function resetForm() {
    setSumber(null);
    setPihakNama("");
    setJumlah("");
    setJatuhTempo("");
    setKeterangan("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sumber) {
      toast.error("Pilih sumber: Pinjaman atau Investor");
      return;
    }
    if (!pihakNama.trim()) {
      toast.error("Nama pihak wajib diisi");
      return;
    }
    if (!(Number(jumlah) > 0)) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    if (!jatuhTempo) {
      toast.error("Tanggal jatuh tempo wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/utang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sumber,
          pihakNama: pihakNama.trim(),
          jumlah: Number(jumlah),
          jatuhTempo: new Date(jatuhTempo).toISOString(),
          keterangan: keterangan.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mencatat utang");
        return;
      }
      toast.success("Utang berhasil dicatat");
      resetForm();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <SearchableSelect
        label="Sumber"
        required
        placeholder="Pilih sumber utang..."
        options={SUMBER_OPTIONS}
        value={sumber}
        onChange={setSumber}
      />
      <Input
        label="Nama Pihak"
        required
        placeholder={sumber === "INVESTOR" ? "mis. Budi (Investor)" : "mis. Bank BCA / Koperasi X"}
        value={pihakNama}
        onChange={(e) => setPihakNama(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Jumlah"
          type="number"
          min={0}
          step="0.01"
          required
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
        />
        <Input
          label="Jatuh Tempo"
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
      <Button type="submit" loading={saving} className="w-full sm:w-auto">
        Simpan Utang
      </Button>
    </form>
  );
}
