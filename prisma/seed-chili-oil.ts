/**
 * Seed data: Chili Oil business
 * Bahan Baku, Kemasan, Produk Jadi, Customer, Agen, Supplier
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("🌶️  Seeding Chili Oil data...\n");

  // ─── SUPPLIER ────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        nama: "UD Cabai Nusantara",
        kontak: "Pak Budi — 0812-3456-7890",
        alamat: "Jl. Raya Pasar Pagi No.12, Surabaya",
      },
    }),
    prisma.supplier.create({
      data: {
        nama: "CV Minyak Sehat Abadi",
        kontak: "Bu Ratna — 0856-1234-5678",
        alamat: "Jl. Industri Minyak No.88, Gresik",
      },
    }),
    prisma.supplier.create({
      data: {
        nama: "Toko Bumbu SPESIAL",
        kontak: "Pak Hadi — 0878-9012-3456",
        alamat: "Pasar Turi Blok B No.5, Surabaya",
      },
    }),
    prisma.supplier.create({
      data: {
        nama: "PT Kemasan Prima",
        kontak: "Ibu Sari — 0813-6789-0123",
        alamat: "Jl. Rungkut Industri III No.20, Surabaya",
      },
    }),
    prisma.supplier.create({
      data: {
        nama: "CV Terasi Madura Asli",
        kontak: "Pak Rahmat — 0857-4567-8901",
        alamat: "Jl. Bangkalan No.33, Sampang, Madura",
      },
    }),
  ]);
  console.log(`✅ Supplier: ${suppliers.length}`);

  // ─── BAHAN BAKU ──────────────────────────────────────────
  const bahanBaku = await Promise.all([
    prisma.bahanBaku.create({
      data: { nama: "Cabai Merah Kering", satuan: "kg", stok: 25, stokMinimum: 5 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Cabai Rawit Kering", satuan: "kg", stok: 15, stokMinimum: 3 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Bawang Merah", satuan: "kg", stok: 10, stokMinimum: 3 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Bawang Putih", satuan: "kg", stok: 12, stokMinimum: 3 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Minyak Goreng (palm)", satuan: "L", stok: 50, stokMinimum: 10 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Garam Halus", satuan: "kg", stok: 8, stokMinimum: 2 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Gula Pasir", satuan: "kg", stok: 5, stokMinimum: 2 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Cuka Apel", satuan: "L", stok: 6, stokMinimum: 1 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Kemiri", satuan: "kg", stok: 3, stokMinimum: 1 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Kencur", satuan: "kg", stok: 2, stokMinimum: 1 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Jahe", satuan: "kg", stok: 3, stokMinimum: 1 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Lada Hitam Bubuk", satuan: "kg", stok: 1.5, stokMinimum: 0.5 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Ketumbar Bubuk", satuan: "kg", stok: 2, stokMinimum: 0.5 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Terasi Udang", satuan: "kg", stok: 4, stokMinimum: 1 },
    }),
    prisma.bahanBaku.create({
      data: { nama: "Ebi (udang kering)", satuan: "kg", stok: 2, stokMinimum: 0.5 },
    }),
  ]);
  console.log(`✅ Bahan Baku: ${bahanBaku.length}`);

  // ─── KEMASAN ─────────────────────────────────────────────
  const kemasan = await Promise.all([
    prisma.kemasan.create({
      data: { nama: "Botol Kaca 100ml", satuan: "pcs", stok: 500, stokMinimum: 100 },
    }),
    prisma.kemasan.create({
      data: { nama: "Botol Kaca 250ml", satuan: "pcs", stok: 300, stokMinimum: 80 },
    }),
    prisma.kemasan.create({
      data: { nama: "Botol Kaca 500ml", satuan: "pcs", stok: 200, stokMinimum: 50 },
    }),
    prisma.kemasan.create({
      data: { nama: "Pouch Stand Up 100ml", satuan: "pcs", stok: 1000, stokMinimum: 200 },
    }),
    prisma.kemasan.create({
      data: { nama: "Pouch Stand Up 250ml", satuan: "pcs", stok: 600, stokMinimum: 150 },
    }),
    prisma.kemasan.create({
      data: { nama: "Box Kardus 6-pack (100ml)", satuan: "pcs", stok: 100, stokMinimum: 20 },
    }),
    prisma.kemasan.create({
      data: { nama: "Box Kardus 12-pack (100ml)", satuan: "pcs", stok: 80, stokMinimum: 20 },
    }),
    prisma.kemasan.create({
      data: { nama: "Label Botol — Original", satuan: "pcs", stok: 800, stokMinimum: 200 },
    }),
    prisma.kemasan.create({
      data: { nama: "Label Botol — Extra Pedas", satuan: "pcs", stok: 500, stokMinimum: 150 },
    }),
    prisma.kemasan.create({
      data: { nama: "Label Botol — Garlic", satuan: "pcs", stok: 400, stokMinimum: 100 },
    }),
    prisma.kemasan.create({
      data: { nama: "Seel Botol (induk)", satuan: "pcs", stok: 1200, stokMinimum: 300 },
    }),
    prisma.kemasan.create({
      data: { nama: "Shrink Wrap 100ml", satuan: "pcs", stok: 600, stokMinimum: 150 },
    }),
  ]);
  console.log(`✅ Kemasan: ${kemasan.length}`);

  // ─── PRODUK JADI ─────────────────────────────────────────
  const produkJadi = await Promise.all([
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Original",
        satuan: "pcs",
        beratBersih: 100,
        harga: 35000,
        stok: 150,
        stokMinimum: 30,
      },
    }),
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Extra Pedas",
        satuan: "pcs",
        beratBersih: 100,
        harga: 38000,
        stok: 100,
        stokMinimum: 25,
      },
    }),
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Garlic",
        satuan: "pcs",
        beratBersih: 100,
        harga: 37000,
        stok: 80,
        stokMinimum: 20,
      },
    }),
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Sambal Matah",
        satuan: "pcs",
        beratBersih: 100,
        harga: 40000,
        stok: 60,
        stokMinimum: 20,
      },
    }),
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Kemiri Special",
        satuan: "pcs",
        beratBersih: 100,
        harga: 42000,
        stok: 50,
        stokMinimum: 15,
      },
    }),
    // ── Ukuran 250ml ──
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Original 250ml",
        satuan: "pcs",
        beratBersih: 250,
        harga: 75000,
        stok: 60,
        stokMinimum: 15,
      },
    }),
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Extra Pedas 250ml",
        satuan: "pcs",
        beratBersih: 250,
        harga: 80000,
        stok: 40,
        stokMinimum: 10,
      },
    }),
    // ── Ukuran 500ml ──
    prisma.produkJadi.create({
      data: {
        nama: "Chili Oil Original 500ml",
        satuan: "pcs",
        beratBersih: 500,
        harga: 135000,
        stok: 25,
        stokMinimum: 8,
      },
    }),
  ]);
  console.log(`✅ Produk Jadi: ${produkJadi.length}`);

  // ─── OUTLET (perlu untuk customer) ──────────────────────
  const outlet = await prisma.outlet.upsert({
    where: { id: "outlet-utama" },
    update: {},
    create: {
      id: "outlet-utama",
      nama: "Outlet Utama",
      alamat: "Jl. Kenjeran No.100, Surabaya",
    },
  });

  // ─── CUSTOMER ────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        nama: "Warung Bu Ani",
        kontak: "Bu Ani — 0812-1111-2222",
        alamat: "Jl. Dharmahusada No.15, Surabaya",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Cafe Kopi Hijau",
        kontak: "Mas Dimas — 0856-2222-3333",
        alamat: "Jl. Pemuda No.88, Surabaya",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Resto Padang Sederhana",
        kontak: "Pak Yanto — 0878-3333-4444",
        alamat: "Jl. Ahmad Yani No.200, Surabaya",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Toko Oleh-Oleh Sby",
        kontak: "Bu Dina — 0813-4444-5555",
        alamat: "Jl. Raya Darmo No.50, Surabaya",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Departement Store XYZ",
        kontak: "Pak Arif — 0857-5555-6666",
        alamat: "Tunjungan Plaza Lt.3, Surabaya",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Online Shop @chilisurabaya",
        kontak: "Rina — 0812-6666-7777",
        alamat: "Online (Instagram)",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Katering Bu Sari",
        kontak: "Bu Sari — 0856-7777-8888",
        alamat: "Jl. Kutai No.10, Surabaya",
      },
    }),
    prisma.customer.create({
      data: {
        nama: "Snack Box Catering",
        kontak: "Mas Rizal — 0878-8888-9999",
        alamat: "Jl. Ngagel No.45, Surabaya",
      },
    }),
  ]);
  console.log(`✅ Customer: ${customers.length}`);

  // ─── AGEN ────────────────────────────────────────────────
  const agen = await Promise.all([
    prisma.agen.create({
      data: {
        nama: "CV Surya Food Distribution",
        kontak: "Pak Hendra — 0812-9000-1111",
        alamat: "Gudang Logam No.7, Kenjeran, Surabaya",
      },
    }),
    prisma.agen.create({
      data: {
        nama: "Toko Grosir Makmur",
        kontak: "Bu Lina — 0856-9111-2222",
        alamat: "Pasar Atom Blok C No.12, Surabaya",
      },
    }),
    prisma.agen.create({
      data: {
        nama: "PT Jaya Raya Mandiri",
        kontak: "Pak Wahyu — 0878-9222-3333",
        alamat: "Jl. Rungkut Mapan Utara No.3, Surabaya",
      },
    }),
    prisma.agen.create({
      data: {
        nama: "Distributor Sidoarjo",
        kontak: "Mas Fajar — 0813-9333-4444",
        alamat: "Jl. Sudirman No.25, Sidoarjo",
      },
    }),
    prisma.agen.create({
      data: {
        nama: "Agen Malang Selecta",
        kontak: "Bu Maya — 0857-9444-5555",
        alamat: "Jl. Veteran No.8, Malang",
      },
    }),
    prisma.agen.create({
      data: {
        nama: "Toko Oleh-Oleh Khas Jatim",
        kontak: "Pak Slamet — 0878-9555-6666",
        alamat: "Jl. Basuki Rahmat No.60, Surabaya",
      },
    }),
  ]);
  console.log(`✅ Agen: ${agen.length}`);

  console.log("\n🎉 Seed chili oil selesai!");
  console.log("──────────────────────────────────");
  console.log(`  Supplier:  ${suppliers.length}`);
  console.log(`  Bahan Baku: ${bahanBaku.length}`);
  console.log(`  Kemasan:   ${kemasan.length}`);
  console.log(`  Produk Jadi: ${produkJadi.length}`);
  console.log(`  Customer:  ${customers.length}`);
  console.log(`  Agen:      ${agen.length}`);
  console.log("──────────────────────────────────");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
