// Logika Reset Data (Owner Room) — dipisah dari route handler supaya mudah
// diaudit terpisah. Referensi: PRD §3.12 & §7 Business Logic poin 7.
//
// PENTING: hard-delete SELURUH data transaksi, TAPI JANGAN hapus master data
// (User/Outlet/Pengaturan/Customer/Agen/Supplier/BahanBaku/Kemasan/ProdukJadi).
// Stok BahanBaku/Kemasan/ProdukJadi direset ke 0 karena seluruh riwayat
// pergerakan stok yang membentuk angka itu ikut dihapus.

import { getPrisma } from "@/lib/prisma";
import { catatAudit, type AuthUser } from "@/lib/api-helpers";

/** Error bisnis yang aman ditampilkan ke user (bukan error server internal). */
export class ResetDataError extends Error {}

const FRASA_KONFIRMASI = ["RESET ASLI", "HAPUS ASLI"] as const;

/** Cocok persis (case-sensitive) dengan salah satu frasa konfirmasi yang diizinkan. */
export function konfirmasiResetValid(konfirmasi: unknown): konfirmasi is string {
  return typeof konfirmasi === "string" && (FRASA_KONFIRMASI as readonly string[]).includes(konfirmasi);
}

/**
 * Hard-delete seluruh data transaksi (order, produksi, stok, keuangan,
 * pengeluaran) dalam satu transaksi DB, lalu tulis satu AuditLog baru sesudahnya.
 *
 * Validasi konfirmasi & role SENGAJA diulang di sini (bukan hanya di route/UI) —
 * jangan pernah percaya gerbang di sisi client untuk aksi destruktif seperti ini.
 */
export async function resetDataAsli(user: AuthUser, konfirmasi: unknown) {
  if (!konfirmasiResetValid(konfirmasi)) {
    throw new ResetDataError('Konfirmasi tidak valid. Ketik persis "RESET ASLI" atau "HAPUS ASLI".');
  }
  if (user.role !== "OWNER") {
    throw new ResetDataError("Hanya OWNER yang boleh melakukan Reset Data.");
  }

  const prisma = getPrisma();

  await prisma.$transaction(
    async (tx) => {
      // Urutan WAJIB: anak sebelum induk, sesuai relasi FK di schema.prisma.
      await tx.auditLog.deleteMany({});
      await tx.pembayaran.deleteMany({});
      await tx.stokMovementBahanBaku.deleteMany({});
      await tx.stokMovementKemasan.deleteMany({});
      await tx.stokMovementProdukJadi.deleteMany({});
      await tx.outputProdukJadi.deleteMany({});
      await tx.outputKemasan.deleteMany({});
      await tx.outputProses.deleteMany({});
      await tx.output.deleteMany({});
      await tx.prosesBahanBaku.deleteMany({});
      await tx.proses.deleteMany({});
      await tx.piutang.deleteMany({});
      await tx.utang.deleteMany({});
      await tx.pembelianItem.deleteMany({});
      await tx.pembelian.deleteMany({});
      await tx.invoice.deleteMany({});
      await tx.suratJalan.deleteMany({});
      await tx.orderPOSItem.deleteMany({});
      await tx.orderPOS.deleteMany({});
      await tx.orderB2BItem.deleteMany({});
      await tx.orderB2B.deleteMany({});
      await tx.modal.deleteMany({});
      await tx.pengeluaran.deleteMany({});

      // Master data TIDAK dihapus — hanya stok berjalan direset ke 0, karena
      // seluruh riwayat StokMovement* yang membentuk angka itu baru saja dihapus.
      await tx.bahanBaku.updateMany({ data: { stok: 0 } });
      await tx.kemasan.updateMany({ data: { stok: 0 } });
      await tx.produkJadi.updateMany({ data: { stok: 0 } });
    },
    { timeout: 30_000 }
  );

  // Ditulis SETELAH transaksi commit, dan sesudah audit_logs lama ikut terhapus
  // di atas — supaya tetap ada 1 jejak bahwa reset ini benar terjadi.
  await catatAudit({
    userId: user.id,
    aksi: "RESET_DATA",
    entitas: "System",
    detail: {
      dilakukanOleh: user.nama,
      userId: user.id,
      tanggal: new Date().toISOString(),
    },
  });
}
