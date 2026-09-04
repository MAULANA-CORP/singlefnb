/**
 * Seed data: Proses Produksi & Output — 3 batch produksi chili oil September 2026
 *
 * Flow: Proses (input bahan baku, status DRAFT→SELESAI) → Output (produk jadi + kemasan, hitung HPP)
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

// Harga beli bahan baku per satuan (estimasi realistis)
const HARGA_BB: Record<string, number> = {
  "Cabai Merah Kering": 80000,     // per kg
  "Cabai Rawit Kering": 95000,     // per kg
  "Bawang Merah": 35000,           // per kg
  "Bawang Putih": 28000,           // per kg
  "Minyak Goreng (palm)": 16000,   // per L
  "Garam Halus": 12000,            // per kg
  "Gula Pasir": 14000,             // per kg
  "Cuka Apel": 45000,              // per L
  "Kemiri": 75000,                 // per kg
  "Kencur": 60000,                 // per kg
  "Jahe": 40000,                   // per kg
  "Lada Hitam Bubuk": 120000,      // per kg
  "Ketumbar Bubuk": 90000,         // per kg
  "Terasi Udang": 85000,           // per kg
  "Ebi (udang kering)": 110000,    // per kg
};

// Harga kemasan per pcs
const HARGA_KEMASAN: Record<string, number> = {
  "Botol Kaca 100ml": 3500,
  "Botol Kaca 250ml": 5500,
  "Botol Kaca 500ml": 8000,
  "Pouch Stand Up 100ml": 1200,
  "Pouch Stand Up 250ml": 1800,
  "Box Kardus 6-pack (100ml)": 4000,
  "Box Kardus 12-pack (100ml)": 6500,
  "Label Botol — Original": 300,
  "Label Botol — Extra Pedas": 300,
  "Label Botol — Garlic": 300,
  "Seel Botol (induk)": 150,
  "Shrink Wrap 100ml": 200,
};

async function main() {
  console.log("🏭 Seeding Proses Produksi & Output...\n");

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: "outlet-utama" } });

  const bbList = await prisma.bahanBaku.findMany();
  const bbMap = new Map(bbList.map((b) => [b.nama, b]));

  const kemasanList = await prisma.kemasan.findMany();
  const kemasanMap = new Map(kemasanList.map((k) => [k.nama, k]));

  const prodList = await prisma.produkJadi.findMany();
  const prodMap = new Map(prodList.map((p) => [p.nama, p]));

  // ═══════════════════════════════════════════════════════════
  // BATCH 1: Chili Oil Original (100ml) — 5 Sept 2026
  // ═══════════════════════════════════════════════════════════
  console.log("── Batch 1: Chili Oil Original 100ml ──");

  const proses1 = await prisma.proses.create({
    data: {
      nomor: buatNomor("PRS", "2026-09-05"),
      outletId: outlet.id,
      userId: admin.id,
      nama: "Adonan Original Wajan 1",
      status: "SELESAI",
      catatan: "Batch pertama September",
      tanggal: new Date("2026-09-05T08:00:00+07:00"),
    },
  });

  const bb1Lines = [
    { nama: "Cabai Merah Kering", qty: 5, waste: 0.2 },
    { nama: "Bawang Merah", qty: 2, waste: 0.1 },
    { nama: "Bawang Putih", qty: 1.5, waste: 0.05 },
    { nama: "Minyak Goreng (palm)", qty: 8, waste: 0 },
    { nama: "Garam Halus", qty: 0.5, waste: 0 },
    { nama: "Gula Pasir", qty: 0.3, waste: 0 },
    { nama: "Kemiri", qty: 0.5, waste: 0 },
    { nama: "Lada Hitam Bubuk", qty: 0.1, waste: 0 },
    { nama: "Ketumbar Bubuk", qty: 0.2, waste: 0 },
  ];

  for (const line of bb1Lines) {
    const bb = bbMap.get(line.nama)!;
    const harga = HARGA_BB[line.nama];
    const totalKurang = line.qty + line.waste;

    await prisma.prosesBahanBaku.create({
      data: {
        prosesId: proses1.id,
        bahanBakuId: bb.id,
        qtyPakai: line.qty,
        qtyWaste: line.waste,
        hargaSatuanSaatItu: harga,
      },
    });

    await prisma.bahanBaku.update({
      where: { id: bb.id },
      data: { stok: { decrement: totalKurang } },
    });

    await prisma.stokMovementBahanBaku.create({
      data: {
        bahanBakuId: bb.id,
        tipe: "OUT",
        qty: totalKurang,
        sumber: "PRODUKSI_PAKAI",
        referensiId: proses1.id,
        keterangan: `Proses ${proses1.nomor}: ${line.nama} ${line.qty}${bb.satuan}${line.waste > 0 ? ` + waste ${line.waste}` : ""}`,
        tanggal: new Date("2026-09-05T08:00:00+07:00"),
      },
    });
  }

  const biaya1 = bb1Lines.reduce((s, l) => s + (l.qty + l.waste) * HARGA_BB[l.nama], 0);
  console.log(`  ✅ Proses ${proses1.nomor} — ${bb1Lines.length} bahan baku — Total biaya ${rp(biaya1)}`);

  // Output Batch 1
  const output1 = await prisma.output.create({
    data: {
      nomor: buatNomor("OUT", "2026-09-05"),
      outletId: outlet.id,
      userId: admin.id,
      catatan: "Output batch original",
      tanggal: new Date("2026-09-05T15:00:00+07:00"),
    },
  });

  await prisma.outputProses.create({
    data: { outputId: output1.id, prosesId: proses1.id },
  });

  // Kemasan
  const kemasan1Lines = [
    { nama: "Botol Kaca 100ml", qty: 150 },
    { nama: "Label Botol — Original", qty: 150 },
    { nama: "Seel Botol (induk)", qty: 150 },
    { nama: "Shrink Wrap 100ml", qty: 150 },
  ];

  for (const k of kemasan1Lines) {
    const kem = kemasanMap.get(k.nama)!;
    const harga = HARGA_KEMASAN[k.nama];
    await prisma.outputKemasan.create({
      data: { outputId: output1.id, kemasanId: kem.id, qtyPakai: k.qty, hargaSatuanSaatItu: harga },
    });
    await prisma.kemasan.update({ where: { id: kem.id }, data: { stok: { decrement: k.qty } } });
    await prisma.stokMovementKemasan.create({
      data: { kemasanId: kem.id, tipe: "OUT", qty: k.qty, sumber: "PRODUKSI_PAKAI", referensiId: output1.id, keterangan: `Output ${output1.nomor}`, tanggal: new Date("2026-09-05T15:00:00+07:00") },
    });
  }

  // Output produk jadi
  const totalBiayaKemasan1 = kemasan1Lines.reduce((s, k) => s + k.qty * HARGA_KEMASAN[k.nama], 0);
  const totalBiayaBatch1 = biaya1 + totalBiayaKemasan1;
  const qty1 = 150;
  const berat1 = 100; // 100 gr per unit
  const totalBerat1 = berat1 * qty1;
  const hppPerGram1 = totalBerat1 > 0 ? totalBiayaBatch1 / totalBerat1 : 0;
  const hppAlokasi1 = hppPerGram1 * totalBerat1;

  const pj1 = prodMap.get("Chili Oil Original")!;
  await prisma.outputProdukJadi.create({
    data: { outputId: output1.id, produkJadiId: pj1.id, qty: qty1, hppAlokasi: hppAlokasi1 },
  });
  await prisma.produkJadi.update({ where: { id: pj1.id }, data: { stok: { increment: qty1 } } });
  await prisma.stokMovementProdukJadi.create({
    data: { produkJadiId: pj1.id, tipe: "IN", qty: qty1, sumber: "PRODUKSI_MASUK", referensiId: output1.id, keterangan: `Output ${output1.nomor}`, tanggal: new Date("2026-09-05T15:00:00+07:00") },
  });

  await prisma.output.update({ where: { id: output1.id }, data: { totalBiaya: totalBiayaBatch1 } });

  console.log(`  ✅ Output ${output1.nomor} — ${pj1.nama} ${qty1}pcs — HPP ${rp(hppAlokasi1 / qty1)}/pc — Total ${rp(totalBiayaBatch1)}`);

  // ═══════════════════════════════════════════════════════════
  // BATCH 2: Chili Oil Extra Pedas + Sambal Matah (100ml) — 12 Sept 2026
  // Multi-output batch: 1 proses → 2 produk
  // ═══════════════════════════════════════════════════════════
  console.log("\n── Batch 2: Extra Pedas + Sambal Matah 100ml ──");

  const proses2 = await prisma.proses.create({
    data: {
      nomor: buatNomor("PRS", "2026-09-12"),
      outletId: outlet.id,
      userId: admin.id,
      nama: "Adonan Pedas & Matah Wajan 1",
      status: "SELESAI",
      catatan: "Multi-output: extra pedas + sambal matah",
      tanggal: new Date("2026-09-12T08:00:00+07:00"),
    },
  });

  const bb2Lines = [
    { nama: "Cabai Merah Kering", qty: 4, waste: 0.15 },
    { nama: "Cabai Rawit Kering", qty: 3, waste: 0.1 },
    { nama: "Bawang Merah", qty: 2, waste: 0.1 },
    { nama: "Bawang Putih", qty: 1, waste: 0.05 },
    { nama: "Minyak Goreng (palm)", qty: 7, waste: 0 },
    { nama: "Garam Halus", qty: 0.4, waste: 0 },
    { nama: "Gula Pasir", qty: 0.3, waste: 0 },
    { nama: "Kencur", qty: 0.3, waste: 0 },
    { nama: "Jahe", qty: 0.2, waste: 0 },
    { nama: "Ebi (udang kering)", qty: 0.5, waste: 0 },
  ];

  for (const line of bb2Lines) {
    const bb = bbMap.get(line.nama)!;
    const harga = HARGA_BB[line.nama];
    const totalKurang = line.qty + line.waste;

    await prisma.prosesBahanBaku.create({
      data: { prosesId: proses2.id, bahanBakuId: bb.id, qtyPakai: line.qty, qtyWaste: line.waste, hargaSatuanSaatItu: harga },
    });
    await prisma.bahanBaku.update({ where: { id: bb.id }, data: { stok: { decrement: totalKurang } } });
    await prisma.stokMovementBahanBaku.create({
      data: { bahanBakuId: bb.id, tipe: "OUT", qty: totalKurang, sumber: "PRODUKSI_PAKAI", referensiId: proses2.id, keterangan: `Proses ${proses2.nomor}: ${line.nama}`, tanggal: new Date("2026-09-12T08:00:00+07:00") },
    });
  }

  const biaya2 = bb2Lines.reduce((s, l) => s + (l.qty + l.waste) * HARGA_BB[l.nama], 0);
  console.log(`  ✅ Proses ${proses2.nomor} — ${bb2Lines.length} bahan baku — Total biaya ${rp(biaya2)}`);

  // Output Batch 2
  const output2 = await prisma.output.create({
    data: { nomor: buatNomor("OUT", "2026-09-12"), outletId: outlet.id, userId: admin.id, catatan: "Output multi-produk", tanggal: new Date("2026-09-12T16:00:00+07:00") },
  });
  await prisma.outputProses.create({ data: { outputId: output2.id, prosesId: proses2.id } });

  // Kemasan
  const kemasan2Lines = [
    { nama: "Botol Kaca 100ml", qty: 200 },
    { nama: "Label Botol — Extra Pedas", qty: 100 },
    { nama: "Label Botol — Original", qty: 100 }, // sambal matah pakai label original
    { nama: "Seel Botol (induk)", qty: 200 },
    { nama: "Shrink Wrap 100ml", qty: 200 },
  ];

  for (const k of kemasan2Lines) {
    const kem = kemasanMap.get(k.nama)!;
    const harga = HARGA_KEMASAN[k.nama];
    await prisma.outputKemasan.create({ data: { outputId: output2.id, kemasanId: kem.id, qtyPakai: k.qty, hargaSatuanSaatItu: harga } });
    await prisma.kemasan.update({ where: { id: kem.id }, data: { stok: { decrement: k.qty } } });
    await prisma.stokMovementKemasan.create({
      data: { kemasanId: kem.id, tipe: "OUT", qty: k.qty, sumber: "PRODUKSI_PAKAI", referensiId: output2.id, keterangan: `Output ${output2.nomor}`, tanggal: new Date("2026-09-12T16:00:00+07:00") },
    });
  }

  const totalBiayaKemasan2 = kemasan2Lines.reduce((s, k) => s + k.qty * HARGA_KEMASAN[k.nama], 0);
  const totalBiayaBatch2 = biaya2 + totalBiayaKemasan2;

  // 2 produk: Extra Pedas 100pcs + Sambal Matah 100pcs
  const qtyEP = 100;
  const qtySM = 100;
  const beratEP = 100;
  const beratSM = 100;
  const totalBerat2 = beratEP * qtyEP + beratSM * qtySM;
  const hppPerGram2 = totalBerat2 > 0 ? totalBiayaBatch2 / totalBerat2 : 0;
  const hppAlokasiEP = hppPerGram2 * beratEP * qtyEP;
  const hppAlokasiSM = hppPerGram2 * beratSM * qtySM;

  const pjEP = prodMap.get("Chili Oil Extra Pedas")!;
  const pjSM = prodMap.get("Chili Oil Sambal Matah")!;

  for (const [pj, qty, hppAlokasi] of [[pjEP, qtyEP, hppAlokasiEP], [pjSM, qtySM, hppAlokasiSM]] as const) {
    await prisma.outputProdukJadi.create({ data: { outputId: output2.id, produkJadiId: pj.id, qty, hppAlokasi } });
    await prisma.produkJadi.update({ where: { id: pj.id }, data: { stok: { increment: qty } } });
    await prisma.stokMovementProdukJadi.create({
      data: { produkJadiId: pj.id, tipe: "IN", qty, sumber: "PRODUKSI_MASUK", referensiId: output2.id, keterangan: `Output ${output2.nomor}`, tanggal: new Date("2026-09-12T16:00:00+07:00") },
    });
    console.log(`  ✅ ${pj.nama} ${qty}pcs — HPP ${rp(hppAlokasi / qty)}/pc`);
  }

  await prisma.output.update({ where: { id: output2.id }, data: { totalBiaya: totalBiayaBatch2 } });
  console.log(`  ✅ Output ${output2.nomor} — Total batch ${rp(totalBiayaBatch2)}`);

  // ═══════════════════════════════════════════════════════════
  // BATCH 3: Chili Oil Original 250ml — 20 Sept 2026
  // ═══════════════════════════════════════════════════════════
  console.log("\n── Batch 3: Chili Oil Original 250ml ──");

  const proses3 = await prisma.proses.create({
    data: {
      nomor: buatNomor("PRS", "2026-09-20"),
      outletId: outlet.id,
      userId: admin.id,
      nama: "Adonan Original Wajan 2 (250ml)",
      status: "SELESAI",
      tanggal: new Date("2026-09-20T09:00:00+07:00"),
    },
  });

  const bb3Lines = [
    { nama: "Cabai Merah Kering", qty: 8, waste: 0.3 },
    { nama: "Bawang Merah", qty: 3, waste: 0.15 },
    { nama: "Bawang Putih", qty: 2, waste: 0.1 },
    { nama: "Minyak Goreng (palm)", qty: 12, waste: 0 },
    { nama: "Garam Halus", qty: 0.8, waste: 0 },
    { nama: "Gula Pasir", qty: 0.5, waste: 0 },
    { nama: "Kemiri", qty: 0.8, waste: 0 },
    { nama: "Lada Hitam Bubuk", qty: 0.15, waste: 0 },
    { nama: "Ketumbar Bubuk", qty: 0.3, waste: 0 },
  ];

  for (const line of bb3Lines) {
    const bb = bbMap.get(line.nama)!;
    const harga = HARGA_BB[line.nama];
    const totalKurang = line.qty + line.waste;

    await prisma.prosesBahanBaku.create({
      data: { prosesId: proses3.id, bahanBakuId: bb.id, qtyPakai: line.qty, qtyWaste: line.waste, hargaSatuanSaatItu: harga },
    });
    await prisma.bahanBaku.update({ where: { id: bb.id }, data: { stok: { decrement: totalKurang } } });
    await prisma.stokMovementBahanBaku.create({
      data: { bahanBakuId: bb.id, tipe: "OUT", qty: totalKurang, sumber: "PRODUKSI_PAKAI", referensiId: proses3.id, keterangan: `Proses ${proses3.nomor}: ${line.nama}`, tanggal: new Date("2026-09-20T09:00:00+07:00") },
    });
  }

  const biaya3 = bb3Lines.reduce((s, l) => s + (l.qty + l.waste) * HARGA_BB[l.nama], 0);
  console.log(`  ✅ Proses ${proses3.nomor} — ${bb3Lines.length} bahan baku — Total biaya ${rp(biaya3)}`);

  // Output Batch 3
  const output3 = await prisma.output.create({
    data: { nomor: buatNomor("OUT", "2026-09-20"), outletId: outlet.id, userId: admin.id, catatan: "Output original 250ml", tanggal: new Date("2026-09-20T16:00:00+07:00") },
  });
  await prisma.outputProses.create({ data: { outputId: output3.id, prosesId: proses3.id } });

  const kemasan3Lines = [
    { nama: "Botol Kaca 250ml", qty: 80 },
    { nama: "Label Botol — Original", qty: 80 },
    { nama: "Seel Botol (induk)", qty: 80 },
  ];

  for (const k of kemasan3Lines) {
    const kem = kemasanMap.get(k.nama)!;
    const harga = HARGA_KEMASAN[k.nama];
    await prisma.outputKemasan.create({ data: { outputId: output3.id, kemasanId: kem.id, qtyPakai: k.qty, hargaSatuanSaatItu: harga } });
    await prisma.kemasan.update({ where: { id: kem.id }, data: { stok: { decrement: k.qty } } });
    await prisma.stokMovementKemasan.create({
      data: { kemasanId: kem.id, tipe: "OUT", qty: k.qty, sumber: "PRODUKSI_PAKAI", referensiId: output3.id, keterangan: `Output ${output3.nomor}`, tanggal: new Date("2026-09-20T16:00:00+07:00") },
    });
  }

  const totalBiayaKemasan3 = kemasan3Lines.reduce((s, k) => s + k.qty * HARGA_KEMASAN[k.nama], 0);
  const totalBiayaBatch3 = biaya3 + totalBiayaKemasan3;
  const qty3 = 80;
  const berat3 = 250;
  const totalBerat3 = berat3 * qty3;
  const hppPerGram3 = totalBerat3 > 0 ? totalBiayaBatch3 / totalBerat3 : 0;
  const hppAlokasi3 = hppPerGram3 * totalBerat3;

  const pj3 = prodMap.get("Chili Oil Original 250ml")!;
  await prisma.outputProdukJadi.create({ data: { outputId: output3.id, produkJadiId: pj3.id, qty: qty3, hppAlokasi: hppAlokasi3 } });
  await prisma.produkJadi.update({ where: { id: pj3.id }, data: { stok: { increment: qty3 } } });
  await prisma.stokMovementProdukJadi.create({
    data: { produkJadiId: pj3.id, tipe: "IN", qty: qty3, sumber: "PRODUKSI_MASUK", referensiId: output3.id, keterangan: `Output ${output3.nomor}`, tanggal: new Date("2026-09-20T16:00:00+07:00") },
  });

  await prisma.output.update({ where: { id: output3.id }, data: { totalBiaya: totalBiayaBatch3 } });
  console.log(`  ✅ Output ${output3.nomor} — ${pj3.nama} ${qty3}pcs — HPP ${rp(hppAlokasi3 / qty3)}/pc — Total ${rp(totalBiayaBatch3)}`);

  // ─── RINGKASAN ───────────────────────────────────────────
  const [prosesCount, outputCount] = await Promise.all([
    prisma.proses.count(),
    prisma.output.count(),
  ]);

  console.log("\n══════════════════════════════════════════════");
  console.log("  RINGKASAN PRODUKSI");
  console.log("══════════════════════════════════════════════");
  console.log(`  Proses  : ${prosesCount} batch (semua SELESAI)`);
  console.log(`  Output  : ${outputCount} batch`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  Batch 1: Original 100ml ×150 — HPP ${rp(hppAlokasi1 / qty1)}/pc`);
  console.log(`  Batch 2: Extra Pedas 100ml ×100 — HPP ${rp(hppAlokasiEP / qtyEP)}/pc`);
  console.log(`           Sambal Matah 100ml ×100 — HPP ${rp(hppAlokasiSM / qtySM)}/pc`);
  console.log(`  Batch 3: Original 250ml ×80 — HPP ${rp(hppAlokasi3 / qty3)}/pc`);
  console.log("══════════════════════════════════════════════");
  console.log("\n🎉 Proses produksi seed selesai!");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
