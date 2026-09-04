/**
 * Fix: Update semua tanggal transaksi ke September 2026 supaya keliatan di Finance Room.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("🔧 Updating tanggal transaksi ke September 2026...\n");

  // ─── MODAL ─────────────────────────────────────
  const modalDates: Record<string, string> = {
    "MODAL_AWAL": "2026-09-01",
    "PENAMBAHAN_BRI": "2026-09-02",
    "PENAMBAHAN_INVESTOR": "2026-09-03",
    "PENAMBAHAN_TAMBAHAN": "2026-09-03",
    "PRIVE_1": "2026-09-01",
    "PRIVE_2": "2026-09-02",
    "PRIVE_3": "2026-09-03",
    "PRIVE_4": "2026-09-04",
  };

  // Ambil semua modal, update berdasarkan keterangan
  const modals = await prisma.modal.findMany({ orderBy: { createdAt: "asc" } });
  for (const m of modals) {
    let tanggalBaru: Date;
    if (m.tipe === "MODAL_AWAL") {
      tanggalBaru = new Date("2026-09-01");
    } else if (m.tipe === "PENAMBAHAN") {
      // Cari urutan
      const idx = modals.filter((x) => x.tipe === "PENAMBAHAN").indexOf(m);
      tanggalBaru = new Date(2026, 8, 2 + idx); // 2, 3, 4 September
    } else {
      // PRIVE
      const idx = modals.filter((x) => x.tipe === "PRIVE").indexOf(m);
      tanggalBaru = new Date(2026, 8, 1 + idx); // 1, 2, 3, 4 September
    }
    await prisma.modal.update({ where: { id: m.id }, data: { tanggal: tanggalBaru } });
  }
  console.log(`✅ Modal: ${modals.length} updated`);

  // ─── PENGELUARAN ───────────────────────────────
  const pengeluarans = await prisma.pengeluaran.findMany({ orderBy: { createdAt: "asc" } });
  
  // Kelompokkan per kategori
  const byKategori: Record<string, typeof pengeluarans> = {};
  for (const p of pengeluarans) {
    if (!byKategori[p.kategori]) byKategori[p.kategori] = [];
    byKategori[p.kategori].push(p);
  }

  let counter = 1;
  for (const [kategori, items] of Object.entries(byKategori)) {
    for (const item of items) {
      const hari = Math.min(counter, 30); // spread dalam bulan
      const tanggalBaru = new Date(2026, 8, hari);
      await prisma.pengeluaran.update({
        where: { id: item.id },
        data: { tanggal: tanggalBaru },
      });
      counter++;
    }
  }
  console.log(`✅ Pengeluaran: ${pengeluarans.length} updated`);

  // ─── Verifikasi ────────────────────────────────
  const start = new Date("2026-09-01");
  const end = new Date("2026-09-30T23:59:59");

  const [modalCount, pengeluaranCount] = await Promise.all([
    prisma.modal.count({ where: { tanggal: { gte: start, lte: end } } }),
    prisma.pengeluaran.count({ where: { tanggal: { gte: start, lte: end } } }),
  ]);

  console.log(`\n📊 Verifikasi (September 2026):`);
  console.log(`   Modal: ${modalCount} transaksi`);
  console.log(`   Pengeluaran: ${pengeluaranCount} transaksi`);
  console.log(`\n🎉 Selesai! Buka Finance Room → arus kas sekarang keliatan.`);

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
