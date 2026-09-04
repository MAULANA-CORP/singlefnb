/**
 * Seed data: Transaksi POS — Cash, Kredit Full (Belum Bayar), Kredit Parsial
 * Buat beberapa order dengan berbagai kondisi pembayaran.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Helper: buat nomor dokumen POS
function buatNomor(tgl: string): string {
  const t = tgl.replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `POS-${t}-${rand}`;
}

// Helper: Rp format
function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

async function main() {
  console.log("🛒 Seeding transaksi POS...\n");

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: "outlet-utama" } });

  // Ambil semua customer
  const customers = await prisma.customer.findMany();
  const custMap = new Map(customers.map((c) => [c.nama, c]));

  // Ambil semua produk
  const produks = await prisma.produkJadi.findMany();
  const prodMap = new Map(produks.map((p) => [p.nama, p]));

  // ─────────────────────────────────────────────────────────
  // 1) CASH — bayar tunai langsung lunas
  // ─────────────────────────────────────────────────────────
  const cashOrders = [
    {
      tanggal: "2026-09-02",
      customer: "Warung Bu Ani",
      catatan: "Warung restock mingguan",
      items: [
        { nama: "Chili Oil Original", qty: 20, harga: 35000 },
        { nama: "Chili Oil Extra Pedas", qty: 10, harga: 38000 },
      ],
    },
    {
      tanggal: "2026-09-05",
      customer: "Cafe Kopi Hijau",
      catatan: "Untuk topping menu pedas",
      items: [
        { nama: "Chili Oil Original", qty: 15, harga: 35000 },
        { nama: "Chili Oil Garlic", qty: 10, harga: 37000 },
      ],
    },
    {
      tanggal: "2026-09-10",
      customer: "Online Shop @chilisurabaya",
      catatan: "Reseller Shopee — pack kecil",
      items: [
        { nama: "Chili Oil Original", qty: 30, harga: 35000 },
        { nama: "Chili Oil Sambal Matah", qty: 15, harga: 40000 },
      ],
    },
    {
      tanggal: "2026-09-15",
      customer: "Katering Bu Sari",
      catatan: "Pesanan katering acara arisan",
      items: [
        { nama: "Chili Oil Original 250ml", qty: 10, harga: 75000 },
        { nama: "Chili Oil Extra Pedas", qty: 20, harga: 38000 },
      ],
    },
    {
      tanggal: "2026-09-20",
      customer: "Snack Box Catering",
      catatan: "Topping snack box",
      items: [
        { nama: "Chili Oil Original", qty: 25, harga: 35000 },
      ],
    },
  ];

  console.log("═══ CASH (Lunas Tunai) ═══");
  for (const o of cashOrders) {
    const customer = custMap.get(o.customer);
    if (!customer) continue;

    const total = o.items.reduce((s, i) => s + i.qty * i.harga, 0);
    const nomor = buatNomor(o.tanggal);

    const order = await prisma.orderPOS.create({
      data: {
        nomor,
        customerId: customer.id,
        outletId: outlet.id,
        userId: admin.id,
        metodeBayar: "CASH",
        statusBayar: "LUNAS",
        subtotal: total,
        total,
        catatan: o.catatan,
        createdAt: new Date(o.tanggal + "T10:00:00+07:00"),
        items: {
          create: o.items.map((it) => ({
            produkJadiId: prodMap.get(it.nama)!.id,
            qty: it.qty,
            hargaSatuan: it.harga,
            subtotal: it.qty * it.harga,
            hppSatuanSaatItu: 0,
          })),
        },
      },
    });

    // Piutang (lunas)
    const piutang = await prisma.piutang.create({
      data: {
        orderPOSId: order.id,
        pihakNama: customer.nama,
        totalTagihan: total,
        totalTerbayar: total,
        jatuhTempo: new Date(o.tanggal + "T23:59:59+07:00"),
        status: "LUNAS",
      },
    });

    // Pembayaran
    await prisma.pembayaran.create({
      data: {
        tipe: "PIUTANG",
        piutangId: piutang.id,
        jumlah: total,
        tanggal: new Date(o.tanggal + "T10:00:00+07:00"),
        catatan: "Bayar tunai",
        userId: admin.id,
      },
    });

    // Kurangi stok
    for (const it of o.items) {
      const prod = prodMap.get(it.nama)!;
      await prisma.produkJadi.update({
        where: { id: prod.id },
        data: { stok: { decrement: it.qty } },
      });
      await prisma.stokMovementProdukJadi.create({
        data: {
          produkJadiId: prod.id,
          tipe: "OUT",
          qty: it.qty,
          sumber: "PENJUALAN_POS",
          referensiId: order.id,
          keterangan: `Cash ${nomor}`,
          tanggal: new Date(o.tanggal + "T10:00:00+07:00"),
        },
      });
    }

    console.log(`  ✅ ${nomor} — ${o.customer} — ${rp(total)} — LUNAS (CASH)`);
  }

  // ─────────────────────────────────────────────────────────
  // 2) KREDIT FULL (Belum Bayar sama sekali)
  // ─────────────────────────────────────────────────────────
  const kreditFullOrders = [
    {
      tanggal: "2026-09-03",
      jatuhTempo: "2026-10-03",
      customer: "Resto Padang Sederhana",
      catatan: "Restock bulanan — jatuh tempo 1 bulan",
      items: [
        { nama: "Chili Oil Original 250ml", qty: 20, harga: 75000 },
        { nama: "Chili Oil Garlic", qty: 15, harga: 37000 },
      ],
    },
    {
      tanggal: "2026-09-08",
      jatuhTempo: "2026-10-08",
      customer: "Toko Oleh-Oleh Sby",
      catatan: "Stok untuk display toko",
      items: [
        { nama: "Chili Oil Original", qty: 40, harga: 35000 },
        { nama: "Chili Oil Extra Pedas 250ml", qty: 10, harga: 80000 },
        { nama: "Chili Oil Sambal Matah", qty: 20, harga: 40000 },
      ],
    },
    {
      tanggal: "2026-09-18",
      jatuhTempo: "2026-10-18",
      customer: "Departement Store XYZ",
      catatan: "Order display rack — jatuh tempo 1 bulan",
      items: [
        { nama: "Chili Oil Original", qty: 50, harga: 35000 },
        { nama: "Chili Oil Garlic", qty: 30, harga: 37000 },
        { nama: "Chili Oil Kemiri Special", qty: 20, harga: 42000 },
      ],
    },
  ];

  console.log("\n═══ KREDIT FULL (Belum Bayar) ═══");
  for (const o of kreditFullOrders) {
    const customer = custMap.get(o.customer);
    if (!customer) continue;

    const total = o.items.reduce((s, i) => s + i.qty * i.harga, 0);
    const nomor = buatNomor(o.tanggal);

    const order = await prisma.orderPOS.create({
      data: {
        nomor,
        customerId: customer.id,
        outletId: outlet.id,
        userId: admin.id,
        metodeBayar: "KREDIT",
        statusBayar: "BELUM_BAYAR",
        tanggalJatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
        subtotal: total,
        total,
        catatan: o.catatan,
        createdAt: new Date(o.tanggal + "T14:00:00+07:00"),
        items: {
          create: o.items.map((it) => ({
            produkJadiId: prodMap.get(it.nama)!.id,
            qty: it.qty,
            hargaSatuan: it.harga,
            subtotal: it.qty * it.harga,
            hppSatuanSaatItu: 0,
          })),
        },
      },
    });

    // Piutang (belum bayar)
    await prisma.piutang.create({
      data: {
        orderPOSId: order.id,
        pihakNama: customer.nama,
        totalTagihan: total,
        totalTerbayar: 0,
        jatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
        status: "BELUM_BAYAR",
      },
    });

    // Kurangi stok
    for (const it of o.items) {
      const prod = prodMap.get(it.nama)!;
      await prisma.produkJadi.update({
        where: { id: prod.id },
        data: { stok: { decrement: it.qty } },
      });
      await prisma.stokMovementProdukJadi.create({
        data: {
          produkJadiId: prod.id,
          tipe: "OUT",
          qty: it.qty,
          sumber: "PENJUALAN_POS",
          referensiId: order.id,
          keterangan: `Kredit ${nomor}`,
          tanggal: new Date(o.tanggal + "T14:00:00+07:00"),
        },
      });
    }

    console.log(`  ✅ ${nomor} — ${o.customer} — ${rp(total)} — BELUM BAYAR (JT: ${o.jatuhTempo})`);
  }

  // ─────────────────────────────────────────────────────────
  // 3) KREDIT PARSIAL — bayar sebagian (DP), sisa jadi piutang
  // ─────────────────────────────────────────────────────────
  const kreditParsialOrders = [
    {
      tanggal: "2026-09-06",
      jatuhTempo: "2026-10-06",
      customer: "Warung Bu Ani",
      catatan: "Restock besar — bayar DP 50%",
      items: [
        { nama: "Chili Oil Original 250ml", qty: 30, harga: 75000 },
        { nama: "Chili Oil Extra Pedas 250ml", qty: 15, harga: 80000 },
      ],
      bayarSekarang: 1650000, // 50% dari 3.450.000 → bayar 1.650.000 (round up)
    },
    {
      tanggal: "2026-09-12",
      jatuhTempo: "2026-10-12",
      customer: "Cafe Kopi Hijau",
      catatan: "Order mingguan — bayar DP 40%",
      items: [
        { nama: "Chili Oil Original", qty: 30, harga: 35000 },
        { nama: "Chili Oil Sambal Matah", qty: 10, harga: 40000 },
        { nama: "Chili Oil Garlic", qty: 10, harga: 37000 },
      ],
      bayarSekarang: 750000, // 40% dari 1.820.000 → bayar 750.000
    },
    {
      tanggal: "2026-09-22",
      jatuhTempo: "2026-10-22",
      customer: "Resto Padang Sederhana",
      catatan: "Restock kedua — bayar DP 60%",
      items: [
        { nama: "Chili Oil Original 500ml", qty: 10, harga: 135000 },
        { nama: "Chili Oil Extra Pedas", qty: 25, harga: 38000 },
      ],
      bayarSekarang: 1310000, // 60% dari 2.300.000 → bayar 1.310.000 (round up)
    },
  ];

  console.log("\n═══ KREDIT PARSIAL (Bayar Sebagian / DP) ═══");
  for (const o of kreditParsialOrders) {
    const customer = custMap.get(o.customer);
    if (!customer) continue;

    const total = o.items.reduce((s, i) => s + i.qty * i.harga, 0);
    const dp = Math.min(o.bayarSekarang, total - 1); // pastikan ada sisa
    const nomor = buatNomor(o.tanggal);
    const statusBayar = dp > 0 ? "PARSIAL" : "BELUM_BAYAR";

    const order = await prisma.orderPOS.create({
      data: {
        nomor,
        customerId: customer.id,
        outletId: outlet.id,
        userId: admin.id,
        metodeBayar: "KREDIT",
        statusBayar,
        tanggalJatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
        subtotal: total,
        total,
        catatan: o.catatan,
        createdAt: new Date(o.tanggal + "T11:00:00+07:00"),
        items: {
          create: o.items.map((it) => ({
            produkJadiId: prodMap.get(it.nama)!.id,
            qty: it.qty,
            hargaSatuan: it.harga,
            subtotal: it.qty * it.harga,
            hppSatuanSaatItu: 0,
          })),
        },
      },
    });

    // Piutang (parsial)
    const piutang = await prisma.piutang.create({
      data: {
        orderPOSId: order.id,
        pihakNama: customer.nama,
        totalTagihan: total,
        totalTerbayar: dp,
        jatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
        status: "PARSIAL",
      },
    });

    // Pembayaran DP
    if (dp > 0) {
      await prisma.pembayaran.create({
        data: {
          tipe: "PIUTANG",
          piutangId: piutang.id,
          jumlah: dp,
          tanggal: new Date(o.tanggal + "T11:00:00+07:00"),
          catatan: `DP ${Math.round((dp / total) * 100)}%`,
          userId: admin.id,
        },
      });
    }

    // Kurangi stok
    for (const it of o.items) {
      const prod = prodMap.get(it.nama)!;
      await prisma.produkJadi.update({
        where: { id: prod.id },
        data: { stok: { decrement: it.qty } },
      });
      await prisma.stokMovementProdukJadi.create({
        data: {
          produkJadiId: prod.id,
          tipe: "OUT",
          qty: it.qty,
          sumber: "PENJUALAN_POS",
          referensiId: order.id,
          keterangan: `Kredit Parsial ${nomor}`,
          tanggal: new Date(o.tanggal + "T11:00:00+07:00"),
        },
      });
    }

    const sisa = total - dp;
    console.log(`  ✅ ${nomor} — ${o.customer} — Total ${rp(total)} — DP ${rp(dp)} — Sisa ${rp(sisa)} (PARSIAL)`);
  }

  // ─── RINGKASAN ───────────────────────────────────────────
  const [totalOrders, cashCount, kreditFullCount, kreditParsialCount, totalPiutang] =
    await Promise.all([
      prisma.orderPOS.count(),
      prisma.orderPOS.count({ where: { metodeBayar: "CASH" } }),
      prisma.orderPOS.count({ where: { metodeBayar: "KREDIT", statusBayar: "BELUM_BAYAR" } }),
      prisma.orderPOS.count({ where: { metodeBayar: "KREDIT", statusBayar: "PARSIAL" } }),
      prisma.piutang.aggregate({ _sum: { totalTagihan: true, totalTerbayar: true } }),
    ]);

  const belumLunas = Number(totalPiutang._sum.totalTagihan!) - Number(totalPiutang._sum.totalTerbayar!);

  console.log("\n══════════════════════════════════════════");
  console.log("  RINGKASAN TRANSAKSI POS");
  console.log("══════════════════════════════════════════");
  console.log(`  Total Order     : ${totalOrders}`);
  console.log(`  ├─ Cash (Lunas) : ${cashCount}`);
  console.log(`  ├─ Kredit Full  : ${kreditFullCount} (Belum Bayar)`);
  console.log(`  └─ Kredit Parsial: ${kreditParsialCount}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Total Piutang   : ${rp(Number(totalPiutang._sum.totalTagihan!))}`);
  console.log(`  Total Terbayar  : ${rp(Number(totalPiutang._sum.totalTerbayar!))}`);
  console.log(`  Sisa Piutang    : ${rp(belumLunas)}`);
  console.log("══════════════════════════════════════════");
  console.log("\n🎉 Transaksi POS selesai!");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
