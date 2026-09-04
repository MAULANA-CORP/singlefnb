"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Database } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";

const FRASA_KONFIRMASI = ["RESET ASLI", "HAPUS ASLI"];
const FRASA_FILL = "ISI DATA DUMMY";

export function ResetDataTab() {
  const [konfirmasi, setKonfirmasi] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [fillKonfirmasi, setFillKonfirmasi] = React.useState("");
  const [fillConfirmOpen, setFillConfirmOpen] = React.useState(false);
  const [fillLoading, setFillLoading] = React.useState(false);

  const validReset = FRASA_KONFIRMASI.includes(konfirmasi);
  const validFill = fillKonfirmasi === FRASA_FILL;

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

  async function handleFillDummy() {
    setFillLoading(true);
    try {
      const res = await fetch("/api/seed-dummy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konfirmasi: FRASA_FILL }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mengisi data dummy");
        return;
      }
      const s = data.summary;
      toast.success(
        `Data dummy berhasil diisi! ${s.pembelian} pembelian, ${s.proses} proses, ${s.output} output, ${s.pos} POS, ${s.b2b} B2B, ${s.pengeluaran} pengeluaran.`
      );
      setFillConfirmOpen(false);
      setFillKonfirmasi("");
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setFillLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Fill Data Dummy */}
      <Card className="border-2 border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Database className="h-5 w-5" /> Isi Data Dummy
          </CardTitle>
        </CardHeader>

        <div className="space-y-3 text-sm text-blue-900 dark:text-blue-200">
          <p className="font-medium">Isi data contoh UMKM Chili Oil untuk testing semua fitur:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>6 Supplier, 15 Bahan Baku, 7 Kemasan, 8 Customer, 4 Agen, 6 Produk Jadi</li>
            <li>10 Pembelian (mix Cash / Kredit / Split) → stok masuk + utang</li>
            <li>7 Proses Produksi + 7 Output → produk jadi + HPP</li>
            <li>17 Transaksi POS (Tunai / QRIS / Transfer) → stok keluar + piutang</li>
            <li>8 Transaksi B2B (agen) → stok keluar</li>
            <li>12 Pengeluaran (sewa, listrik, gas, marketing)</li>
          </ul>
          <p className="font-medium">
            Data lama akan DIHAPUS dulu, lalu data dummy baru diisi. Stok akan menyesuaikan otomatis.
          </p>
        </div>

        <div className="mt-5 max-w-sm space-y-3">
          <Input
            label='Ketik "ISI DATA DUMMY" untuk mengaktifkan tombol'
            value={fillKonfirmasi}
            onChange={(e) => setFillKonfirmasi(e.target.value)}
            placeholder="ISI DATA DUMMY"
          />
          <Button variant="primary" disabled={!validFill} onClick={() => setFillConfirmOpen(true)} className="w-full">
            <Database className="h-4 w-4" /> Isi Data Dummy
          </Button>
        </div>

        <ConfirmDialog
          open={fillConfirmOpen}
          onOpenChange={setFillConfirmOpen}
          title="Isi data dummy UMKM?"
          description="Semua data transaksi yang ada akan dihapus, lalu data dummy Chili Oil akan diisi. Stok dan keuangan akan menyesuaikan otomatis."
          confirmLabel="Ya, isi data dummy"
          loading={fillLoading}
          onConfirm={handleFillDummy}
        />
      </Card>

      {/* Reset Data */}
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
            <li>Seluruh Audit Log lama</li>
          </ul>
          <p>
            Data master (User, Outlet, Pengaturan, Bahan Baku, Kemasan, Produk Jadi, Customer, Agen, Supplier){" "}
            <strong>tetap ada</strong> — hanya stok berjalan Bahan Baku/Kemasan/Produk Jadi akan direset ke 0.
          </p>
          <p className="font-medium">
            Tindakan ini TIDAK BISA DIBATALKAN.
          </p>
        </div>

        <div className="mt-5 max-w-sm space-y-3">
          <Input
            label='Ketik "RESET ASLI" atau "HAPUS ASLI" untuk mengaktifkan tombol'
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            placeholder="RESET ASLI"
          />
          <Button variant="danger" disabled={!validReset} onClick={() => setConfirmOpen(true)} className="w-full">
            Reset Sekarang
          </Button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Konfirmasi terakhir: reset seluruh data?"
          description="Setelah ditekan, seluruh data transaksi akan dihapus permanen dan tidak bisa dikembalikan."
          confirmLabel="Ya, hapus semua data"
          danger
          loading={loading}
          onConfirm={handleReset}
        />
      </Card>
    </div>
  );
}
