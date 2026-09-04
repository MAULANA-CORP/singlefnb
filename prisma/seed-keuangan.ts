/**
 * Seed data: Keuangan — Modal & Pengeluaran usaha Chili Oil
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("💰 Seeding keuangan Chili Oil...\n");

  // Ambil user admin
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: "outlet-utama" } });

  // ─── MODAL ────────────────────────────────────────────────
  // 1) Saldo awal dari sendiri
  const modalAwal = await prisma.modal.create({
    data: {
      tipe: "MODAL_AWAL",
      sumberDana: "UANG_SENDIRI",
      jumlah: 150000000,
      tanggal: new Date("2025-01-05"),
      keterangan: "Modal awal usaha chili oil — tabungan pribadi",
      userId: admin.id,
    },
  });

  // 2) Nambah saldo pinjaman
  const pinjamanBank = await prisma.modal.create({
    data: {
      tipe: "PENAMBAHAN",
      sumberDana: "PINJAMAN",
      jumlah: 50000000,
      tanggal: new Date("2025-02-10"),
      keterangan: "Pinjaman BRI KUR — cicilan 24 bulan, bunga 6%/thn",
      userId: admin.id,
    },
  });

  // 3) Nambah saldo investor
  const investor = await prisma.modal.create({
    data: {
      tipe: "PENAMBAHAN",
      sumberDana: "INVESTOR",
      jumlah: 75000000,
      tanggal: new Date("2025-03-01"),
      keterangan: "Investasi dari Pak Hadi (saham 30%)",
      userId: admin.id,
    },
  });

  // 4) Penambahan dari uang sendiri lagi (tambahan beli mesin)
  const tambahanModal = await prisma.modal.create({
    data: {
      tipe: "PENAMBAHAN",
      sumberDana: "UANG_SENDIRI",
      jumlah: 20000000,
      tanggal: new Date("2025-04-15"),
      keterangan: "Tambahan modal beli mesin penggiling & sealing",
      userId: admin.id,
    },
  });

  // 5) Prive (ambil untuk keperluan pribadi)
  const prive1 = await prisma.modal.create({
    data: {
      tipe: "PRIVE",
      sumberDana: null,
      jumlah: 5000000,
      tanggal: new Date("2025-05-01"),
      keterangan: "Prive bulan Mei — keperluan pribadi",
      userId: admin.id,
    },
  });

  const prive2 = await prisma.modal.create({
    data: {
      tipe: "PRIVE",
      sumberDana: null,
      jumlah: 3000000,
      tanggal: new Date("2025-06-01"),
      keterangan: "Prive bulan Juni — bayar SPP anak",
      userId: admin.id,
    },
  });

  const prive3 = await prisma.modal.create({
    data: {
      tipe: "PRIVE",
      sumberDana: null,
      jumlah: 5000000,
      tanggal: new Date("2025-07-01"),
      keterangan: "Prive bulan Juli — keperluan Lebaran",
      userId: admin.id,
    },
  });

  const prive4 = await prisma.modal.create({
    data: {
      tipe: "PRIVE",
      sumberDana: null,
      jumlah: 4000000,
      tanggal: new Date("2025-08-01"),
      keterangan: "Prive bulan Agustus",
      userId: admin.id,
    },
  });

  console.log(`✅ Modal: 8 transaksi`);
  console.log(`   ├─ MODAL_AWAL (UANG_SENDIRI)   Rp 150.000.000`);
  console.log(`   ├─ PENAMBAHAN (PINJAMAN)        Rp  50.000.000`);
  console.log(`   ├─ PENAMBAHAN (INVESTOR)        Rp  75.000.000`);
  console.log(`   ├─ PENAMBAHAN (UANG_SENDIRI)    Rp  20.000.000`);
  console.log(`   └─ PRIVE (4x)                   Rp  17.000.000`);

  // ─── PENGELUARAN USAHA ────────────────────────────────────
  const pengeluarans = await Promise.all([
    // SEWA tempat
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-01-06"),
        keterangan: "Sewa tempat produksi bulan Januari",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-02-05"),
        keterangan: "Sewa tempat produksi bulan Februari",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-03-05"),
        keterangan: "Sewa tempat produksi bulan Maret",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-04-05"),
        keterangan: "Sewa tempat produksi bulan April",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-05-05"),
        keterangan: "Sewa tempat produksi bulan Mei",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-06-05"),
        keterangan: "Sewa tempat produksi bulan Juni",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-07-05"),
        keterangan: "Sewa tempat produksi bulan Juli",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "SEWA",
        jumlah: 3500000,
        tanggal: new Date("2025-08-05"),
        keterangan: "Sewa tempat produksi bulan Agustus",
      },
    }),

    // LISTRIK & AIR
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 750000,
        tanggal: new Date("2025-01-10"),
        keterangan: "Listrik & air bulan Januari",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 800000,
        tanggal: new Date("2025-02-10"),
        keterangan: "Listrik & air bulan Februari",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 850000,
        tanggal: new Date("2025-03-10"),
        keterangan: "Listrik & air bulan Maret (produksi mulai naik)",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 900000,
        tanggal: new Date("2025-04-10"),
        keterangan: "Listrik & air bulan April",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 950000,
        tanggal: new Date("2025-05-10"),
        keterangan: "Listrik & air bulan Mei",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 1000000,
        tanggal: new Date("2025-06-10"),
        keterangan: "Listrik & air bulan Juni",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 1100000,
        tanggal: new Date("2025-07-10"),
        keterangan: "Listrik & air bulan Juli (puasa produksi naik)",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LISTRIK_AIR",
        jumlah: 1050000,
        tanggal: new Date("2025-08-10"),
        keterangan: "Listrik & air bulan Agustus",
      },
    }),

    // GAJI karyawan
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 4500000,
        tanggal: new Date("2025-01-28"),
        keterangan: "Gaji 2 karyawan produksi bulan Januari",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 4500000,
        tanggal: new Date("2025-02-28"),
        keterangan: "Gaji 2 karyawan produksi bulan Februari",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 6500000,
        tanggal: new Date("2025-03-28"),
        keterangan: "Gaji 3 karyawan (tambah 1 orang) bulan Maret",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 6500000,
        tanggal: new Date("2025-04-28"),
        keterangan: "Gaji karyawan bulan April",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 6500000,
        tanggal: new Date("2025-05-28"),
        keterangan: "Gaji karyawan bulan Mei",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 6500000,
        tanggal: new Date("2025-06-28"),
        keterangan: "Gaji karyawan bulan Juni",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 6500000,
        tanggal: new Date("2025-07-28"),
        keterangan: "Gaji karyawan bulan Juli",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "GAJI",
        jumlah: 6500000,
        tanggal: new Date("2025-08-28"),
        keterangan: "Gaji karyawan bulan Agustus",
      },
    }),

    // TRANSPORTASI / pengiriman
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 350000,
        tanggal: new Date("2025-01-20"),
        keterangan: "Ongkir kirim ke agen Surabaya Utara",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 500000,
        tanggal: new Date("2025-02-18"),
        keterangan: "Ongkir kirim ke agen Sidoarjo",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 450000,
        tanggal: new Date("2025-03-22"),
        keterangan: "Ongkir kirim 2 agen",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 600000,
        tanggal: new Date("2025-04-20"),
        keterangan: "Ongkir kirim ke Malang & Sidoarjo",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 550000,
        tanggal: new Date("2025-05-22"),
        keterangan: "Ongkir kirim bulk order",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 700000,
        tanggal: new Date("2025-06-20"),
        keterangan: "Ongkir kirim ke 3 agen",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 650000,
        tanggal: new Date("2025-07-22"),
        keterangan: "Ongkir kirim ke Malang, Sidoarjo, Madiun",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "TRANSPORTASI",
        jumlah: 500000,
        tanggal: new Date("2025-08-20"),
        keterangan: "Ongkir kirim agen bulan Agustus",
      },
    }),

    // MARKETING
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 2000000,
        tanggal: new Date("2025-02-14"),
        keterangan: "Ads Instagram — campaign awal",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 1500000,
        tanggal: new Date("2025-03-15"),
        keterangan: "Cetak brosur 500 lembar + banner",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 1500000,
        tanggal: new Date("2025-04-12"),
        keterangan: "Ads Instagram bulan April",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 2500000,
        tanggal: new Date("2025-05-20"),
        keterangan: "Kerjasama food influencer Surabaya",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 1000000,
        tanggal: new Date("2025-06-10"),
        keterangan: "Ads Instagram bulan Juni",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 1500000,
        tanggal: new Date("2025-07-15"),
        keterangan: "Kerjasama reviewer YouTube",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "MARKETING",
        jumlah: 1200000,
        tanggal: new Date("2025-08-08"),
        keterangan: "Ads Instagram + giveaway product",
      },
    }),

    // LAINNYA — biaya operasional umum
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 800000,
        tanggal: new Date("2025-01-15"),
        keterangan: "Belanja alat kebersihan & HACCP kit",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 1200000,
        tanggal: new Date("2025-02-20"),
        keterangan: "Bayar NPWP & perizinan usaha",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 350000,
        tanggal: new Date("2025-03-25"),
        keterangan: "Service mesin sealing",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 2500000,
        tanggal: new Date("2025-04-18"),
        keterangan: "Beli mesin penggiling cabai baru",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 200000,
        tanggal: new Date("2025-05-15"),
        keterangan: "Pulsa & paket internet (kasir online)",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 450000,
        tanggal: new Date("2025-06-18"),
        keterangan: "Service AC ruang produksi",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 300000,
        tanggal: new Date("2025-07-20"),
        keterangan: "Pulsa & internet bulan Juli",
      },
    }),
    prisma.pengeluaran.create({
      data: {
        outletId: outlet.id,
        userId: admin.id,
        kategori: "LAINNYA",
        jumlah: 350000,
        tanggal: new Date("2025-08-15"),
        keterangan: "Pulsa & internet bulan Agustus",
      },
    }),
  ]);

  console.log(`\n✅ Pengeluaran: ${pengeluarans.length} transaksi\n`);

  // Ringkasan per kategori
  const byKategori: Record<string, { count: number; total: number }> = {};
  for (const p of pengeluarans) {
    if (!byKategori[p.kategori]) byKategori[p.kategori] = { count: 0, total: 0 };
    byKategori[p.kategori].count++;
    byKategori[p.kategori].total += Number(p.jumlah);
  }

  console.log("─────────────────────────────────────────────");
  console.log("  KATEGORI         | TXN | TOTAL");
  console.log("─────────────────────────────────────────────");
  for (const [kat, data] of Object.entries(byKategori)) {
    const total = data.total.toLocaleString("id-ID");
    console.log(`  ${kat.padEnd(18)}| ${String(data.count).padStart(3)} | Rp ${total}`);
  }
  console.log("─────────────────────────────────────────────");

  const grandTotal = pengeluarans.reduce((s, p) => s + Number(p.jumlah), 0);
  console.log(`  TOTAL PENGELUARAN     Rp ${grandTotal.toLocaleString("id-ID")}`);

  console.log("\n🎉 Keuangan seed selesai!");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
