/**
 * Seed data: Transaksi B2B — Cash, Kredit Full (Belum Bayar), Kredit Parsial
 * Termasuk Invoice & Surat Jalan untuk variasi status yang realistis.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function buatNomor(prefix: string, tgl: string): string {
  const t = tgl.replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${t}-${rand}`;
}

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

async function main() {
  console.log("📦 Seeding transaksi B2B...\n");

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: "outlet-utama" } });

  const agens = await prisma.agen.findMany();
  const agenMap = new Map(agens.map((a) => [a.nama, a]));

  const produks = await prisma.produkJadi.findMany();
  const prodMap = new Map(produks.map((p) => [p.nama, p]));

  // Helper: hitung status order dari kondisi
  function hitungStatus(params: {
    adaInvoice: boolean;
    adaSuratJalan: boolean;
    statusBayar: string;
  }): string {
    if (params.statusBayar === "LUNAS" && params.adaSuratJalan) return "SELESAI";
    if (params.statusBayar === "LUNAS") return "LUNAS";
    if (params.statusBayar === "PARSIAL") return "PARSIAL";
    if (params.adaSuratJalan) return "DIKIRIM";
    if (params.adaInvoice) return "INVOICE";
    return "DRAFT";
  }

  // ═══════════════════════════════════════════════════════════
  // 1) CASH — Bayar lunas saat order, sudah dikirim & selesai
  // ═══════════════════════════════════════════════════════════
  const cashOrders = [
    {
      tanggal: "2026-09-02",
      agen: "CV Surya Food Distribution",
      noResi: "SJD-20260903-001",
      catatan: "Order awal bulan — restock agen Surabaya",
      items: [
        { nama: "Chili Oil Original", qty: 100, harga: 28000 },
        { nama: "Chili Oil Extra Pedas", qty: 50, harga: 30000 },
        { nama: "Chili Oil Garlic", qty: 50, harga: 29000 },
      ],
    },
    {
      tanggal: "2026-09-10",
      agen: "Toko Grosir Makmur",
      noResi: "SJD-20260911-002",
      catatan: "Restock mingguan — grosirAtom",
      items: [
        { nama: "Chili Oil Original 250ml", qty: 40, harga: 60000 },
        { nama: "Chili Oil Extra Pedas 250ml", qty: 20, harga: 64000 },
      ],
    },
    {
      tanggal: "2026-09-18",
      agen: "Toko Oleh-Oleh Khas Jatim",
      noResi: "SJD-20260919-003",
      catatan: "Order untuk display toko Basuki Rahmat",
      items: [
        { nama: "Chili Oil Original", qty: 80, harga: 28000 },
        { nama: "Chili Oil Sambal Matah", qty: 40, harga: 32000 },
        { nama: "Chili Oil Kemiri Special", qty: 30, harga: 34000 },
      ],
    },
  ];

  console.log("═══ CASH (Lunas + Dikirim + Selesai) ═══");
  for (const o of cashOrders) {
    const agen = agenMap.get(o.agen)!;
    const total = o.items.reduce((s, i) => s + i.qty * i.harga, 0);

    // 1. Buat Order
    const order = await prisma.orderB2B.create({
      data: {
        nomor: buatNomor("ORDB2B", o.tanggal),
        agenId: agen.id,
        outletId: outlet.id,
        userId: admin.id,
        metodeBayar: "TRANSFER_QRIS",
        statusBayar: "LUNAS",
        subtotal: total,
        total,
        catatan: o.catatan,
        createdAt: new Date(o.tanggal + "T09:00:00+07:00"),
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

    // 2. Invoice
    const inv = await prisma.invoice.create({
      data: {
        orderB2BId: order.id,
        nomorInvoice: buatNomor("INV", o.tanggal),
        tanggalTerbit: new Date(o.tanggal + "T09:05:00+07:00"),
      },
    });

    // 3. Surat Jalan
    const kirimDate = new Date(o.tanggal);
    kirimDate.setDate(kirimDate.getDate() + 1);
    await prisma.suratJalan.create({
      data: {
        orderB2BId: order.id,
        noResi: o.noResi,
        tanggalKirim: kirimDate,
      },
    });

    // 4. Piutang (lunas)
    const piutang = await prisma.piutang.create({
      data: {
        orderB2BId: order.id,
        pihakNama: agen.nama,
        totalTagihan: total,
        totalTerbayar: total,
        jatuhTempo: new Date(o.tanggal + "T23:59:59+07:00"),
        status: "LUNAS",
      },
    });

    // 5. Pembayaran full
    await prisma.pembayaran.create({
      data: {
        tipe: "PIUTANG",
        piutangId: piutang.id,
        jumlah: total,
        tanggal: new Date(o.tanggal + "T09:00:00+07:00"),
        catatan: "Bayar transfer lunas",
        userId: admin.id,
      },
    });

    // 6. Update status order
    await prisma.orderB2B.update({
      where: { id: order.id },
      data: { status: "SELESAI" },
    });

    // 7. Kurangi stok
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
          sumber: "PENJUALAN_B2B",
          referensiId: order.id,
          keterangan: `B2B Cash ${order.nomor}`,
          tanggal: new Date(o.tanggal + "T09:00:00+07:00"),
        },
      });
    }

    console.log(`  ✅ ${order.nomor} — ${o.agen} — ${rp(total)} — LUNAS/SELESAI`);
  }

  // ═══════════════════════════════════════════════════════════
  // 2) KREDIT FULL (Belum Bayar) — Invoice terbit, belum dibayar
  // ═══════════════════════════════════════════════════════════
  const kreditFullOrders = [
    {
      tanggal: "2026-09-05",
      jatuhTempo: "2026-10-05",
      agen: "PT Jaya Raya Mandiri",
      catatan: "Order besar — jatuh tempo 1 bulan",
      items: [
        { nama: "Chili Oil Original", qty: 200, harga: 27000 },
        { nama: "Chili Oil Extra Pedas", qty: 100, harga: 29000 },
        { nama: "Chili Oil Garlic", qty: 100, harga: 28000 },
        { nama: "Chili Oil Sambal Matah", qty: 50, harga: 32000 },
      ],
    },
    {
      tanggal: "2026-09-15",
      jatuhTempo: "2026-10-15",
      agen: "Distributor Sidoarjo",
      catatan: "Restock Sidoarjo — jatuh tempo 1 bulan",
      items: [
        { nama: "Chili Oil Original 250ml", qty: 60, harga: 60000 },
        { nama: "Chili Oil Original 500ml", qty: 20, harga: 110000 },
      ],
    },
  ];

  console.log("\n═══ KREDIT FULL (Invoice + Belum Bayar) ═══");
  for (const o of kreditFullOrders) {
    const agen = agenMap.get(o.agen)!;
    const total = o.items.reduce((s, i) => s + i.qty * i.harga, 0);

    // 1. Order
    const order = await prisma.orderB2B.create({
      data: {
        nomor: buatNomor("ORDB2B", o.tanggal),
        agenId: agen.id,
        outletId: outlet.id,
        userId: admin.id,
        metodeBayar: "KREDIT",
        statusBayar: "BELUM_BAYAR",
        tanggalJatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
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

    // 2. Invoice
    await prisma.invoice.create({
      data: {
        orderB2BId: order.id,
        nomorInvoice: buatNomor("INV", o.tanggal),
        tanggalTerbit: new Date(o.tanggal + "T10:05:00+07:00"),
      },
    });

    // 3. Piutang (belum bayar)
    await prisma.piutang.create({
      data: {
        orderB2BId: order.id,
        pihakNama: agen.nama,
        totalTagihan: total,
        totalTerbayar: 0,
        jatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
        status: "BELUM_BAYAR",
      },
    });

    // 4. Update status
    await prisma.orderB2B.update({
      where: { id: order.id },
      data: { status: "INVOICE" },
    });

    // 5. Kurangi stok
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
          sumber: "PENJUALAN_B2B",
          referensiId: order.id,
          keterangan: `B2B Kredit ${order.nomor}`,
          tanggal: new Date(o.tanggal + "T10:00:00+07:00"),
        },
      });
    }

    console.log(`  ✅ ${order.nomor} — ${o.agen} — ${rp(total)} — INVOICE/BELUM BAYAR (JT: ${o.jatuhTempo})`);
  }

  // ═══════════════════════════════════════════════════════════
  // 3) KREDIT PARSIAL — Invoice + Sudah Dikirim + Bayar DP
  // ═══════════════════════════════════════════════════════════
  const kreditParsialOrders = [
    {
      tanggal: "2026-09-03",
      jatuhTempo: "2026-10-03",
      agen: "CV Surya Food Distribution",
      noResi: "SJD-20260904-004",
      catatan: "Restock kedua — bayar DP 50%",
      items: [
        { nama: "Chili Oil Original", qty: 150, harga: 27500 },
        { nama: "Chili Oil Kemiri Special", qty: 40, harga: 33000 },
      ],
      bayar: 2700000, // ~50% dari 5.425.000
    },
    {
      tanggal: "2026-09-12",
      jatuhTempo: "2026-10-12",
      agen: "Agen Malang Selecta",
      noResi: "SJD-20260913-005",
      catatan: "Order Malang — bayar DP 40%",
      items: [
        { nama: "Chili Oil Original", qty: 120, harga: 28000 },
        { nama: "Chili Oil Extra Pedas", qty: 80, harga: 30000 },
        { nama: "Chili Oil Garlic", qty: 60, harga: 29000 },
      ],
      bayar: 2500000, // ~40% dari 6.600.000
    },
    {
      tanggal: "2026-09-20",
      jatuhTempo: "2026-10-20",
      agen: "Toko Grosir Makmur",
      noResi: "SJD-20260921-006",
      catatan: "Order khusus ukuran besar — bayar DP 60%",
      items: [
        { nama: "Chili Oil Original 250ml", qty: 80, harga: 60000 },
        { nama: "Chili Oil Extra Pedas 250ml", qty: 40, harga: 64000 },
        { nama: "Chili Oil Original 500ml", qty: 30, harga: 110000 },
      ],
      bayar: 7200000, // ~60% dari 12.160.000
    },
  ];

  console.log("\n═══ KREDIT PARSIAL (Invoice + Dikirim + DP) ═══");
  for (const o of kreditParsialOrders) {
    const agen = agenMap.get(o.agen)!;
    const total = o.items.reduce((s, i) => s + i.qty * i.harga, 0);
    const dp = Math.min(o.bayar, total - 1);

    // 1. Order
    const order = await prisma.orderB2B.create({
      data: {
        nomor: buatNomor("ORDB2B", o.tanggal),
        agenId: agen.id,
        outletId: outlet.id,
        userId: admin.id,
        metodeBayar: "TRANSFER_QRIS",
        statusBayar: "PARSIAL",
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

    // 2. Invoice
    await prisma.invoice.create({
      data: {
        orderB2BId: order.id,
        nomorInvoice: buatNomor("INV", o.tanggal),
        tanggalTerbit: new Date(o.tanggal + "T11:05:00+07:00"),
      },
    });

    // 3. Surat Jalan (sudah dikirim)
    const kirimDate = new Date(o.tanggal);
    kirimDate.setDate(kirimDate.getDate() + 1);
    await prisma.suratJalan.create({
      data: {
        orderB2BId: order.id,
        noResi: o.noResi,
        tanggalKirim: kirimDate,
      },
    });

    // 4. Piutang (parsial)
    const piutang = await prisma.piutang.create({
      data: {
        orderB2BId: order.id,
        pihakNama: agen.nama,
        totalTagihan: total,
        totalTerbayar: dp,
        jatuhTempo: new Date(o.jatuhTempo + "T23:59:59+07:00"),
        status: "PARSIAL",
      },
    });

    // 5. Pembayaran DP
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

    // 6. Update status
    await prisma.orderB2B.update({
      where: { id: order.id },
      data: { status: "PARSIAL" }, // PARSIAL + surat jalan → PARSIAL
    });

    // 7. Kurangi stok
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
          sumber: "PENJUALAN_B2B",
          referensiId: order.id,
          keterangan: `B2B Parsial ${order.nomor}`,
          tanggal: new Date(o.tanggal + "T11:00:00+07:00"),
        },
      });
    }

    const sisa = total - dp;
    console.log(`  ✅ ${order.nomor} — ${o.agen} — Total ${rp(total)} — DP ${rp(dp)} — Sisa ${rp(sisa)} (PARSIAL/DIKIRIM)`);
  }

  // ─── RINGKASAN ───────────────────────────────────────────
  const [totalOrders, cashCount, invoiceCount, parsialCount] = await Promise.all([
    prisma.orderB2B.count(),
    prisma.orderB2B.count({ where: { status: "SELESAI" } }),
    prisma.orderB2B.count({ where: { status: "INVOICE" } }),
    prisma.orderB2B.count({ where: { status: "PARSIAL" } }),
  ]);

  const piutangStats = await prisma.piutang.aggregate({
    where: { orderB2BId: { not: null } },
    _sum: { totalTagihan: true, totalTerbayar: true },
  });

  const belumLunas = Number(piutangStats._sum.totalTagihan!) - Number(piutangStats._sum.totalTerbayar!);

  console.log("\n══════════════════════════════════════════════");
  console.log("  RINGKASAN TRANSAKSI B2B");
  console.log("══════════════════════════════════════════════");
  console.log(`  Total Order       : ${totalOrders}`);
  console.log(`  ├─ Cash (Selesai) : ${cashCount} (Invoice + Dikirim + Lunas)`);
  console.log(`  ├─ Kredit Full    : ${invoiceCount} (Invoice, Belum Bayar)`);
  console.log(`  └─ Kredit Parsial : ${parsialCount} (Invoice + Dikirim + DP)`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  Total Tagihan B2B : ${rp(Number(piutangStats._sum.totalTagihan!))}`);
  console.log(`  Total Terbayar    : ${rp(Number(piutangStats._sum.totalTerbayar!))}`);
  console.log(`  Sisa Piutang B2B  : ${rp(belumLunas)}`);
  console.log("══════════════════════════════════════════════");
  console.log("\n🎉 Transaksi B2B selesai!");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
