"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SupplierOption } from "./types";

export function SupplierCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplier: SupplierOption) => void;
}) {
  const [nama, setNama] = React.useState("");
  const [kontak, setKontak] = React.useState("");
  const [alamat, setAlamat] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNama("");
      setKontak("");
      setAlamat("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama supplier wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/database/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: nama.trim(), kontak: kontak.trim(), alamat: alamat.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menambah supplier");
        return;
      }
      if (data.duplikat) {
        toast.message("Supplier dengan nama ini sudah ada — dipilih otomatis");
      } else {
        toast.success("Supplier baru ditambahkan");
      }
      onCreated(data.data);
      onOpenChange(false);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Tambah Supplier Baru">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Nama Supplier" required autoFocus value={nama} onChange={(e) => setNama(e.target.value)} />
        <Input label="Kontak (opsional)" value={kontak} onChange={(e) => setKontak(e.target.value)} />
        <Input label="Alamat (opsional)" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        <Button type="submit" loading={saving} className="w-full">
          Simpan Supplier
        </Button>
      </form>
    </Dialog>
  );
}
