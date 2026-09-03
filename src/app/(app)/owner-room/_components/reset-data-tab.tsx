"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";

const FRASA_KONFIRMASI = ["RESET ASLI", "HAPUS ASLI"];

export function ResetDataTab() {
  const [konfirmasi, setKonfirmasi] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const valid = FRASA_KONFIRMASI.includes(konfirmasi);

  async function handleReset() {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konfirmasi }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mereset data");
        return;
      }
      toast.success("Semua data transaksi berhasil direset.");
      setConfirmOpen(false);
      setKonfirmasi("");
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-2 border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" /> Reset Data
        </CardTitle>
      </CardHeader>

      <div className="space-y-3 text-sm text-red-900 dark:text-red-200">
        <p className="font-medium">Tindakan ini akan MENGHAPUS PERMANEN seluruh data transaksi:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Semua Order POS &amp; B2B, Invoice, dan Surat Jalan</li>
          <li>Semua Utang, Piutang, dan riwayat Pembayaran/cicilan</li>
          <li>Semua Pembelian ke Supplier</li>
          <li>Semua Batch Produksi dan riwayat pergerakan stok</li>
          <li>Modal, Prive, dan Pengeluaran</li>
          <li>Seluruh Audit Log lama (dicatat ulang 1 entri baru khusus untuk aksi reset ini)</li>
        </ul>
        <p>
          Data master (User, Outlet, Pengaturan, Bahan Baku, Kemasan, Produk Jadi, Customer, Agen, Supplier){" "}
          <strong>tetap ada</strong> — hanya stok berjalan Bahan Baku/Kemasan/Produk Jadi akan direset ke 0, karena
          seluruh riwayat yang membentuk angka stok itu ikut terhapus.
        </p>
        <p className="font-medium">
          Tindakan ini TIDAK BISA DIBATALKAN. Gunakan hanya untuk keluar dari mode trial/latihan sebelum mulai data
          asli.
        </p>
      </div>

      <div className="mt-5 max-w-sm space-y-3">
        <Input
          label='Ketik "RESET ASLI" atau "HAPUS ASLI" untuk mengaktifkan tombol'
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          placeholder="RESET ASLI"
        />
        <Button variant="danger" disabled={!valid} onClick={() => setConfirmOpen(true)} className="w-full">
          Reset Sekarang
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Konfirmasi terakhir: reset seluruh data?"
        description="Ini pengecekan terakhir. Setelah ditekan, seluruh data transaksi akan dihapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Ya, hapus semua data"
        danger
        loading={loading}
        onConfirm={handleReset}
      />
    </Card>
  );
}
