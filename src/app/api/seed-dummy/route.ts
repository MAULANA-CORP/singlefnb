import { NextResponse } from "next/server";
import { withOwner, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { resetDataAsli, ResetDataError } from "@/lib/reset-data";

/**
 * POST /api/seed-dummy — Reset semua data lalu isi data dummy UMKM Chili Oil.
 * OWNER-only. Body: { konfirmasi: "ISI DATA DUMMY" }
 *
 * Data mencakup SEMUA fitur: pembelian (cash/credit/split), proses produksi,
 * output, POS (cash/credit), B2B, pengeluaran, utang/piutang.
 */
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.konfirmasi !== "ISI DATA DUMMY") {
      return NextResponse.json({ error: 'Ketik "ISI DATA DUMMY" untuk konfirmasi' }, { status: 400 });
    }

    // 1) Reset semua data transaksi
    await resetDataAsli(user, "RESET ASLI");

    const prisma = getPrisma();
    const now = new Date();
    const d = (m: number, day: number) => new Date(2026, m, day);

    // =========================================================================
    // MASTER DATA
    // =========================================================================

    // Outlet (mungkin sudah ada dari seed awal, skip jika sudah ada)
    let outletId = "outlet-utama";
    const existingOutlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!existingOutlet) {
      const o = await prisma.outlet.create({ data: { id: outletId, nama: "Outlet Utama", alamat: "Jl. Raya Utama No. 1", isActive: true } });
      outletId = o.id;
    }

    // Supplier
    const suppliers = await Promise.all([
      prisma.supplier.create({ data: { nama: "UD Cabai Nusantara", kontak: "Pak Budi — 0812xxxx1111" } }),
      prisma.supplier.create({ data: { nama: "CV Minyak Sehat Abadi", kontak: "Bu Sari — 0813xxxx2222" } }),
      prisma.supplier.create({ data: { nama: "Toko Bumbu SPESIAL", kontak: "Pak Joko — 0856xxxx3333" } }),
      prisma.supplier.create({ data: { nama: "PT Kemasan Prima", kontak: "Ibu Rina — 0878xxxx4444" } }),
      prisma.supplier.create({ data: { nama: "CV Terasi Madura Asli", kontak: "Pak Hasan — 0821xxxx5555" } }),
      prisma.supplier.create({ data: { nama: "Pasar Induk Cheng Ho", kontak: "Pak Li — 0815xxxx6666" } }),
    ]);

    // Bahan Baku
    const bahanBaku = await Promise.all([
      prisma.bahanBaku.create({ data: { nama: "Cabai Merah Kering", satuan: "kg", stok: 0, stokMinimum: 5 } }),
      prisma.bahanBaku.create({ data: { nama: "Cabai Rawit Kering", satuan: "kg", stok: 0, stokMinimum: 3 } }),
      prisma.bahanBaku.create({ data: { nama: "Cabai Merah Segar", satuan: "kg", stok: 0, stokMinimum: 5 } }),
      prisma.bahanBaku.create({ data: { nama: "Bawang Merah", satuan: "kg", stok: 0, stokMinimum: 3 } }),
      prisma.bahanBaku.create({ data: { nama: "Bawang Putih", satuan: "kg", stok: 0, stokMinimum: 3 } }),
      prisma.bahanBaku.create({ data: { nama: "Minyak Goreng", satuan: "L", stok: 0, stokMinimum: 10 } }),
      prisma.bahanBaku.create({ data: { nama: "Garam", satuan: "kg", stok: 0, stokMinimum: 2 } }),
      prisma.bahanBaku.create({ data: { nama: "Gula Pasir", satuan: "kg", stok: 0, stokMinimum: 2 } }),
      prisma.bahanBaku.create({ data: { nama: "Kemiri", satuan: "kg", stok: 0, stokMinimum: 1 } }),
      prisma.bahanBaku.create({ data: { nama: "Kencur", satuan: "kg", stok: 0, stokMinimum: 1 } }),
      prisma.bahanBaku.create({ data: { nama: "Jahe", satuan: "kg", stok: 0, stokMinimum: 1 } }),
      prisma.bahanBaku.create({ data: { nama: "Lada Putih", satuan: "kg", stok: 0, stokMinimum: 0.5 } }),
      prisma.bahanBaku.create({ data: { nama: "Ketumbar", satuan: "kg", stok: 0, stokMinimum: 0.5 } }),
      prisma.bahanBaku.create({ data: { nama: "Terasi Udang", satuan: "kg", stok: 0, stokMinimum: 1 } }),
      prisma.bahanBaku.create({ data: { nama: "Ebi Kering", satuan: "kg", stok: 0, stokMinimum: 0.5 } }),
    ]);

    // Kemasan
    const kemasan = await Promise.all([
      prisma.kemasan.create({ data: { nama: "Botol Kaca 100ml", satuan: "pcs", stok: 0, stokMinimum: 50 } }),
      prisma.kemasan.create({ data: { nama: "Botol Kaca 250ml", satuan: "pcs", stok: 0, stokMinimum: 30 } }),
      prisma.kemasan.create({ data: { nama: "Botol Kaca 500ml", satuan: "pcs", stok: 0, stokMinimum: 20 } }),
      prisma.kemasan.create({ data: { nama: "Label Original", satuan: "pcs", stok: 0, stokMinimum: 100 } }),
      prisma.kemasan.create({ data: { nama: "Label Extra Pedas", satuan: "pcs", stok: 0, stokMinimum: 50 } }),
      prisma.kemasan.create({ data: { nama: "Shrink Wrap", satuan: "pcs", stok: 0, stokMinimum: 100 } }),
      prisma.kemasan.create({ data: { nama: "Box Kardus 12-pack", satuan: "pcs", stok: 0, stokMinimum: 20 } }),
    ]);

    // Customer
    const customers = await Promise.all([
      prisma.customer.create({ data: { nama: "Warung Bu Ani", kontak: "0812xxxx7001", alamat: "Jl. Sudirman No. 10" } }),
      prisma.customer.create({ data: { nama: "Cafe Kopi Senja", kontak: "0813xxxx7002", alamat: "Jl. Asia Afrika No. 25" } }),
      prisma.customer.create({ data: { nama: "Resto Padang Merdeka", kontak: "0856xxxx7003", alamat: "Jl. Merdeka No. 50" } }),
      prisma.customer.create({ data: { nama: "Toko Oleh-Oleh Khas", kontak: "0878xxxx7004", alamat: "Jl. Pahlawan No. 15" } }),
      prisma.customer.create({ data: { nama: "Minimarket Sebelah", kontak: "0821xxxx7005", alamat: "Jl. Kenanga No. 8" } }),
      prisma.customer.create({ data: { nama: "Katering Haji Mamat", kontak: "0815xxxx7006", alamat: "Jl. Mawar No. 3" } }),
      prisma.customer.create({ data: { nama: "Depot Ayam Geprek Mas Toni", kontak: "0857xxxx7007", alamat: "Jl. Cendana No. 12" } }),
      prisma.customer.create({ data: { nama: "Rumah Makan Sederhana", kontak: "0819xxxx7008", alamat: "Jl. Jenderal No. 20" } }),
    ]);

    // Agen
    const agens = await Promise.all([
      prisma.agen.create({ data: { nama: "Agen Bandung Selatan", kontak: "0812xxxx8001", alamat: "Bandung" } }),
      prisma.agen.create({ data: { nama: "Agen Jakarta Pusat", kontak: "0813xxxx8002", alamat: "Jakarta" } }),
      prisma.agen.create({ data: { nama: "Agen Bogor Timur", kontak: "0856xxxx8003", alamat: "Bogor" } }),
      prisma.agen.create({ data: { nama: "Agen Depok Utara", kontak: "0878xxxx8004", alamat: "Depok" } }),
    ]);

    // Produk Jadi
    const produkJadi = await Promise.all([
      prisma.produkJadi.create({ data: { nama: "Chili Oil Original 100ml", satuan: "pcs", stok: 0, stokMinimum: 20, harga: 18000, beratBersih: 100 } }),
      prisma.produkJadi.create({ data: { nama: "Chili Oil Original 250ml", satuan: "pcs", stok: 0, stokMinimum: 10, harga: 35000, beratBersih: 250 } }),
      prisma.produkJadi.create({ data: { nama: "Chili Oil Extra Pedas 100ml", satuan: "pcs", stok: 0, stokMinimum: 20, harga: 20000, beratBersih: 100 } }),
      prisma.produkJadi.create({ data: { nama: "Chili Oil Sambal Matah 100ml", satuan: "pcs", stok: 0, stokMinimum: 15, harga: 22000, beratBersih: 100 } }),
      prisma.produkJadi.create({ data: { nama: "Chili Oil Garlic 100ml", satuan: "pcs", stok: 0, stokMinimum: 15, harga: 19000, beratBersih: 100 } }),
      prisma.produkJadi.create({ data: { nama: "Chili Oil Original 500ml", satuan: "pcs", stok: 0, stokMinimum: 5, harga: 60000, beratBersih: 500 } }),
    ]);

    // =========================================================================
    // PEMBELIAN (mix: cash, credit, split) — qty kecil, harga realistis
    // =========================================================================
    // Format: { supplierIdx, items: [{ bbIdx, qty, harga }], caraBayar, jumlahBayar?, hari }

    const pembelianData = [
      // 1. Pembelian pertama — CASH, semua stok awal
      { si: 0, items: [[0, 10, 85000], [1, 5, 95000], [3, 5, 25000], [4, 3, 28000], [5, 20, 14000]], bayar: "CASH", hari: 1 },
      // 2. Pembelian kemasan — CREDIT
      { si: 3, items: [[-1, 0, 200, 3500], [-1, 1, 100, 5500], [-1, 3, 300, 800], [-1, 5, 300, 500]], bayar: "CREDIT", jatuhTempo: d(8, 15), hari: 2 },
      // 3. Cabai merah segar — CASH
      { si: 0, items: [[2, 8, 45000], [9, 2, 35000], [10, 1, 30000]], bayar: "CASH", hari: 3 },
      // 4. Bumbu tambahan — SPLIT (bayar sebagian)
      { si: 2, items: [[6, 3, 12000], [7, 2, 15000], [8, 1, 55000], [11, 0.5, 120000], [12, 0.5, 95000]], bayar: "SPLIT", bayarJumlah: 50000, jatuhTempo: d(8, 20), hari: 5 },
      // 5. Terasi + ebi — CREDIT
      { si: 4, items: [[13, 2, 85000], [14, 1, 150000]], bayar: "CREDIT", jatuhTempo: d(8, 25), hari: 7 },
      // 6. Minyak tambahan — CASH
      { si: 1, items: [[5, 15, 14500]], bayar: "CASH", hari: 9 },
      // 7. Cabai kering restock — SPLIT
      { si: 0, items: [[0, 5, 87000], [1, 3, 97000]], bayar: "SPLIT", bayarJumlah: 400000, jatuhTempo: d(8, 28), hari: 11 },
      // 8. Kemasan restock — CREDIT
      { si: 3, items: [[-1, 0, 150, 3500], [-1, 4, 50, 900], [-1, 6, 30, 8500]], bayar: "CREDIT", jatuhTempo: d(9, 5), hari: 13 },
      // 9. Bawang + garam — CASH
      { si: 5, items: [[3, 4, 26000], [4, 3, 29000], [6, 2, 13000], [7, 2, 16000]], bayar: "CASH", hari: 15 },
      // 10. Kemiri + kencur — CREDIT
      { si: 2, items: [[8, 2, 56000], [9, 1.5, 36000]], bayar: "CREDIT", jatuhTempo: d(9, 10), hari: 17 },
    ];

    // Kemasan index mapping: -1 = kemasan, bbIdx jadi kmIdx
    // bbIdx: 0=Botol100, 1=Botol250, 2=Botol500, 3=LabelOrg, 4=LabelPedas, 5=Shrink, 6=Box

    const stokTracker: Record<string, { stok: number; hargaRR: number }> = {};
    for (const bb of bahanBaku) stokTracker[`bb-${bb.id}`] = { stok: 0, hargaRR: 0 };
    for (const km of kemasan) stokTracker[`km-${km.id}`] = { stok: 0, hargaRR: 0 };

    const allPembelians: { id: string; nomor: string; total: number; supplierNama: string; hari: number }[] = [];

    for (const pd of pembelianData) {
      const supplier = suppliers[pd.si];
      const nominalItems = pd.items.filter(it => it[0] >= 0);
      const kmItems = pd.items.filter(it => it[0] === -1);
      const total = [
        ...nominalItems.map(it => (it[1] as number) * (it[2] as number)),
        ...kmItems.map(it => (it[2] as number) * (it[3] as number)),
      ].reduce((a, b) => a + b, 0);

      const nomor = `PB-2026090${pd.hari}-${String(allPembelians.length + 1).padStart(3, "0")}`;
      const tanggal = d(8, pd.hari);

      const pb = await prisma.pembelian.create({
        data: {
          nomor,
          supplierId: supplier.id,
          outletId,
          userId: user.id,
          tanggal,
          total,
          keterangan: `Pembelian ${pd.bayar}`,
          items: {
            create: [
              ...nominalItems.map(it => {
                const bbId = bahanBaku[it[0] as number].id;
                const qty = it[1] as number;
                const harga = it[2] as number;
                // Update tracker
                const t = stokTracker[`bb-${bbId}`];
                const stokLama = t.stok;
                t.stok += qty;
                t.hargaRR = t.stok > 0 ? Math.round(((t.hargaRR * stokLama + harga * qty) / t.stok) * 100) / 100 : harga;
                return { bahanBakuId: bbId, kemasanId: null, qty, hargaSatuan: harga, subtotal: qty * harga };
              }),
              ...kmItems.map(it => {
                const kmId = kemasan[it[1] as number].id;
                const qty = it[2] as number;
                const harga = it[3] as number;
                const t = stokTracker[`km-${kmId}`];
                t.stok += qty;
                t.hargaRR = t.stok > 0 ? Math.round(((t.hargaRR * (t.stok - qty) + harga * qty) / t.stok) * 100) / 100 : harga;
                return { bahanBakuId: null, kemasanId: kmId, qty, hargaSatuan: harga, subtotal: qty * harga };
              }),
            ],
          },
        },
        include: { items: true },
      });

      // Create stok movements + update stok + average cost
      for (const item of pb.items) {
        if (item.bahanBakuId) {
          await prisma.bahanBaku.update({
            where: { id: item.bahanBakuId },
            data: { stok: { increment: item.qty }, hargaRataRata: stokTracker[`bb-${item.bahanBakuId}`].hargaRR },
          });
          await prisma.stokMovementBahanBaku.create({
            data: { bahanBakuId: item.bahanBakuId, tipe: "IN", qty: item.qty, sumber: "PEMBELIAN", referensiId: pb.id, tanggal, keterangan: `Pembelian ${nomor}` },
          });
        } else if (item.kemasanId) {
          await prisma.kemasan.update({ where: { id: item.kemasanId }, data: { stok: { increment: item.qty } } });
          await prisma.stokMovementKemasan.create({
            data: { kemasanId: item.kemasanId, tipe: "IN", qty: item.qty, sumber: "PEMBELIAN", referensiId: pb.id, tanggal, keterangan: `Pembelian ${nomor}` },
          });
        }
      }

      // Create utang
      if (pd.bayar === "CREDIT" || pd.bayar === "SPLIT") {
        const jumlahBayar = pd.bayar === "SPLIT" ? (pd as any).bayarJumlah : 0;
        const sisaUtang = total - jumlahBayar;
        const utang = await prisma.utang.create({
          data: {
            sumber: "PEMBELIAN", pembelianId: pb.id, pihakNama: supplier.nama,
            totalUtang: sisaUtang, jatuhTempo: (pd as any).jatuhTempo || d(9, 1),
            status: jumlahBayar > 0 ? "PARSIAL" : "BELUM_BAYAR",
            totalTerbayar: jumlahBayar,
          },
        });
        if (jumlahBayar > 0) {
          await prisma.pembayaran.create({
            data: { tipe: "UTANG", utangId: utang.id, jumlah: jumlahBayar, tanggal, catatan: `Bayar cash saat belanja`, userId: user.id },
          });
        }
      }

      allPembelians.push({ id: pb.id, nomor, total, supplierNama: supplier.nama, hari: pd.hari });
    }

    // =========================================================================
    // PROSES PRODUKSI (pakai hargaRataRata dari stok)
    // =========================================================================
    const prosesData = [
      // Batch 1: Original — cabai kering, bawang, minyak, kemiri
      { nama: "Adonan Original Wajan 1", hari: 3, bahan: [[0, 5, 0.5], [3, 3, 0.2], [4, 2, 0.1], [5, 8, 0], [8, 0.5, 0], [6, 0.5, 0]] },
      // Batch 2: Extra Pedas — cabai rawit dominan
      { nama: "Adonan Extra Pedas", hari: 6, bahan: [[0, 3, 0.3], [1, 4, 0.3], [3, 2, 0.1], [4, 1.5, 0.1], [5, 6, 0], [6, 0.3, 0]] },
      // Batch 3: Sambal Matah
      { nama: "Adonan Sambal Matah", hari: 8, bahan: [[2, 4, 0.2], [3, 3, 0.2], [4, 2, 0.1], [9, 0.5, 0], [10, 0.3, 0], [5, 5, 0]] },
      // Batch 4: Garlic
      { nama: "Adonan Garlic", hari: 10, bahan: [[0, 3, 0.3], [4, 4, 0.2], [5, 7, 0], [6, 0.4, 0], [7, 0.5, 0]] },
      // Batch 5: Original lagi (restock)
      { nama: "Adonan Original Wajan 2", hari: 13, bahan: [[0, 6, 0.4], [1, 2, 0.2], [3, 3, 0.2], [4, 2, 0.1], [5, 10, 0], [8, 0.5, 0]] },
      // Batch 6: Extra Pedas lagi
      { nama: "Adonan Extra Pedas Batch 2", hari: 16, bahan: [[0, 2, 0.2], [1, 3, 0.2], [3, 2, 0.1], [4, 1, 0.1], [5, 5, 0]] },
      // Batch 7: Sambal Matah lagi
      { nama: "Adonan Sambal Matah Batch 2", hari: 18, bahan: [[2, 3, 0.2], [3, 2, 0.1], [4, 1.5, 0.1], [9, 0.4, 0], [5, 4, 0]] },
    ];

    const prosesList: { id: string; nomor: string; totalBiaya: number }[] = [];

    for (const pd of prosesData) {
      const tanggal = d(8, pd.hari);
      // Hitung totalBiaya dari hargaRataRata
      let totalBiaya = 0;
      const bahanBakuData: { id: string; qtyPakai: number; qtyWaste: number; harga: number }[] = [];
      for (const [bbIdx, qty, waste] of pd.bahan) {
        const bb = bahanBaku[bbIdx];
        const harga = stokTracker[`bb-${bb.id}`].hargaRR;
        totalBiaya += (qty + waste) * harga;
        bahanBakuData.push({ id: bb.id, qtyPakai: qty, qtyWaste: waste, harga });
      }

      const nomor = `PRS-2026090${pd.hari}-${String(prosesList.length + 1).padStart(3, "0")}`;
      const proses = await prisma.proses.create({
        data: { nomor, outletId, userId: user.id, nama: pd.nama, status: "SELESAI", tanggal },
      });

      for (const b of bahanBakuData) {
        await prisma.prosesBahanBaku.create({
          data: { prosesId: proses.id, bahanBakuId: b.id, qtyPakai: b.qtyPakai, qtyWaste: b.qtyWaste, hargaSatuanSaatItu: b.harga },
        });
        const totalKurang = b.qtyPakai + b.qtyWaste;
        await prisma.bahanBaku.update({ where: { id: b.id }, data: { stok: { decrement: totalKurang } } });
        await prisma.stokMovementBahanBaku.create({
          data: { bahanBakuId: b.id, tipe: "OUT", qty: totalKurang, sumber: "PRODUKSI_PAKAI", referensiId: proses.id, tanggal, keterangan: `Proses ${nomor}` },
        });
      }

      prosesList.push({ id: proses.id, nomor, totalBiaya });
    }

    // =========================================================================
    // OUTPUT PRODUKSI (pakai hargaRataRata kemasan)
    // =========================================================================
    const outputData = [
      // Output 1 dari Batch 1: Original 100ml ×80, Original 250ml ×30
      { pi: 0, hari: 4, items: [[0, 80, 0], [3, 80, 0], [5, 80, 0]], produk: [[0, 80], [1, 30]] },
      // Output 2 dari Batch 2: Extra Pedas 100ml ×60
      { pi: 1, hari: 7, items: [[0, 60, 0], [4, 60, 0], [5, 60, 0]], produk: [[2, 60]] },
      // Output 3 dari Batch 3: Sambal Matah 100ml ×50
      { pi: 2, hari: 9, items: [[0, 50, 0], [3, 50, 0], [5, 50, 0]], produk: [[3, 50]] },
      // Output 4 dari Batch 4: Garlic 100ml ×50
      { pi: 3, hari: 11, items: [[0, 50, 0], [3, 50, 0], [5, 50, 0]], produk: [[4, 50]] },
      // Output 5 dari Batch 5: Original 100ml ×100, Original 250ml ×40
      { pi: 4, hari: 14, items: [[0, 100, 0], [3, 100, 0], [5, 100, 0]], produk: [[0, 100], [1, 40]] },
      // Output 6 dari Batch 6: Extra Pedas 100ml ×40
      { pi: 5, hari: 17, items: [[0, 40, 0], [4, 40, 0], [5, 40, 0]], produk: [[2, 40]] },
      // Output 7 dari Batch 7: Sambal Matah 100ml ×30
      { pi: 6, hari: 19, items: [[0, 30, 0], [3, 30, 0], [5, 30, 0]], produk: [[3, 30]] },
    ];

    for (const od of outputData) {
      const proses = prosesList[od.pi];
      const tanggal = d(8, od.hari);
      const nomor = `OUT-2026090${od.hari}-${String(od.pi + 1).padStart(3, "0")}`;

      // Hitung total biaya kemasan
      let totalBiayaKemasan = 0;
      const kemasanLines: { id: string; qty: number; harga: number }[] = [];
      for (const [kmIdx, qty] of od.items) {
        const km = kemasan[kmIdx];
        const harga = stokTracker[`km-${km.id}`].hargaRR;
        totalBiayaKemasan += qty * harga;
        kemasanLines.push({ id: km.id, qty, harga });
      }

      const totalBiayaBatch = proses.totalBiaya + totalBiayaKemasan;

      const output = await prisma.output.create({
        data: { nomor, outletId, userId: user.id, tanggal, totalBiaya: totalBiayaBatch },
      });

      // Hubungkan output ke proses via junction table
      await prisma.outputProses.create({
        data: { outputId: output.id, prosesId: proses.id },
      });

      // Kemasan lines
      for (const kl of kemasanLines) {
        await prisma.outputKemasan.create({
          data: { outputId: output.id, kemasanId: kl.id, qtyPakai: kl.qty, hargaSatuanSaatItu: kl.harga },
        });
        await prisma.kemasan.update({ where: { id: kl.id }, data: { stok: { decrement: kl.qty } } });
        await prisma.stokMovementKemasan.create({
          data: { kemasanId: kl.id, tipe: "OUT", qty: kl.qty, sumber: "PRODUKSI_PAKAI", referensiId: output.id, tanggal, keterangan: `Output ${nomor}` },
        });
      }

      // Produk jadi lines — hitung HPP per produk berdasarkan berat
      const totalBerat = od.produk.reduce((sum, [piIdx, qty]) => sum + qty * (produkJadi[piIdx].beratBersih ?? 100), 0);
      for (const [piIdx, qty] of od.produk) {
        const pj = produkJadi[piIdx];
        const berat = pj.beratBersih ?? 100;
        const hppAlokasi = totalBiayaBatch > 0 && totalBerat > 0 ? (totalBiayaBatch * (berat * qty)) / totalBerat : 0;
        const hppPerUnit = qty > 0 ? hppAlokasi / qty : 0;

        await prisma.outputProdukJadi.create({
          data: { outputId: output.id, produkJadiId: pj.id, qty, hppAlokasi: Math.round(hppAlokasi) },
        });
        await prisma.produkJadi.update({ where: { id: pj.id }, data: { stok: { increment: qty } } });
        await prisma.stokMovementProdukJadi.create({
          data: { produkJadiId: pj.id, tipe: "IN", qty, sumber: "PRODUKSI_MASUK", referensiId: output.id, tanggal, keterangan: `Output ${nomor}` },
        });
      }
    }

    // =========================================================================
    // POS (mix: cash, credit)
    // =========================================================================
    const posData = [
      { ci: 0, hari: 5, items: [[0, 5], [2, 3]], bayar: "TUNAI" },
      { ci: 1, hari: 5, items: [[1, 2], [4, 4]], bayar: "TUNAI" },
      { ci: 2, hari: 6, items: [[0, 10], [3, 5]], bayar: "QRIS" },
      { ci: 3, hari: 7, items: [[0, 8], [2, 6], [4, 4]], bayar: "TRANSFER" },
      { ci: 0, hari: 8, items: [[1, 3], [3, 2]], bayar: "TUNAI" },
      { ci: 4, hari: 9, items: [[0, 15], [2, 10], [3, 5]], bayar: "TUNAI" },
      { ci: 5, hari: 10, items: [[0, 20], [1, 5]], bayar: "TRANSFER" },
      { ci: 6, hari: 11, items: [[2, 8], [4, 6]], bayar: "TUNAI" },
      { ci: 7, hari: 12, items: [[0, 12], [3, 8]], bayar: "QRIS" },
      { ci: 0, hari: 13, items: [[0, 6], [1, 3], [2, 4]], bayar: "TUNAI" },
      { ci: 1, hari: 14, items: [[0, 10], [4, 8]], bayar: "TRANSFER" },
      { ci: 2, hari: 15, items: [[0, 15], [2, 10], [3, 5]], bayar: "TUNAI" },
      { ci: 3, hari: 16, items: [[1, 5], [3, 3]], bayar: "QRIS" },
      { ci: 4, hari: 17, items: [[0, 8], [2, 6]], bayar: "TUNAI" },
      { ci: 5, hari: 18, items: [[0, 10], [1, 4], [4, 6]], bayar: "TRANSFER" },
      { ci: 6, hari: 19, items: [[0, 12], [2, 8]], bayar: "TUNAI" },
      { ci: 7, hari: 20, items: [[3, 5], [4, 3]], bayar: "TUNAI" },
    ];

    for (const pd of posData) {
      const customer = customers[pd.ci];
      const tanggal = d(8, pd.hari);
      const nomor = `POS-2026090${pd.hari}-${String(pd.hari).padStart(3, "0")}${String(pd.ci).padStart(2, "0")}`;

      let total = 0;
      const itemData: { produkId: string; qty: number; harga: number }[] = [];
      for (const [piIdx, qty] of pd.items) {
        const pj = produkJadi[piIdx];
        itemData.push({ produkId: pj.id, qty, harga: Number(pj.harga) });
        total += qty * Number(pj.harga);
      }

      const isKredit = pd.bayar === "KREDIT";
      const metodeBayar = pd.bayar as any;

      const order = await prisma.orderPOS.create({
        data: {
          nomor, outletId, userId: user.id, customerId: customer.id,
          metodeBayar, subtotal: total, total: total,
          statusBayar: isKredit ? "BELUM_BAYAR" : "LUNAS",
          ...(isKredit ? { tanggalJatuhTempo: d(9, 15) } : {}),
          items: {
            create: itemData.map(it => ({
              produkJadiId: it.produkId, qty: it.qty, hargaSatuan: it.harga, subtotal: it.qty * it.harga,
            })),
          },
        },
        include: { items: true },
      });

      // Kurangi stok produk jadi
      for (const item of order.items) {
        await prisma.produkJadi.update({ where: { id: item.produkJadiId }, data: { stok: { decrement: item.qty } } });
        await prisma.stokMovementProdukJadi.create({
          data: { produkJadiId: item.produkJadiId, tipe: "OUT", qty: item.qty, sumber: "PENJUALAN_POS", referensiId: order.id, tanggal, keterangan: `POS ${nomor}` },
        });
      }

      // Piutang untuk kredit
      if (isKredit) {
        await prisma.piutang.create({
          data: { pihakNama: customer.nama, totalTagihan: total, jatuhTempo: d(9, 15), status: "BELUM_BAYAR", orderPOSId: order.id },
        });
      }
    }

    // =========================================================================
    // B2B (mix: cash, credit)
    // =========================================================================
    const b2bData = [
      { ai: 0, hari: 6, items: [[0, 20], [2, 15]], bayar: "TRANSFER" },
      { ai: 1, hari: 8, items: [[0, 30], [1, 10], [3, 10]], bayar: "TRANSFER" },
      { ai: 2, hari: 10, items: [[0, 15], [4, 10]], bayar: "TUNAI" },
      { ai: 0, hari: 12, items: [[2, 20], [3, 15]], bayar: "TRANSFER" },
      { ai: 3, hari: 14, items: [[0, 25], [1, 15], [2, 10]], bayar: "TRANSFER" },
      { ai: 1, hari: 16, items: [[0, 20], [4, 10]], bayar: "TRANSFER" },
      { ai: 2, hari: 18, items: [[0, 15], [2, 10], [3, 5]], bayar: "TUNAI" },
      { ai: 0, hari: 20, items: [[1, 20], [3, 10]], bayar: "TRANSFER" },
    ];

    for (const bd of b2bData) {
      const agen = agens[bd.ai];
      const tanggal = d(8, bd.hari);
      const nomor = `B2B-2026090${bd.hari}-${String(bd.ai + 1).padStart(3, "0")}${String(bd.hari).padStart(2, "0")}`;

      let total = 0;
      const itemData: { produkId: string; qty: number; harga: number }[] = [];
      for (const [piIdx, qty] of bd.items) {
        const pj = produkJadi[piIdx];
        const hargaJual = Math.round(Number(pj.harga) * 0.85); // harga agen 15% diskon
        itemData.push({ produkId: pj.id, qty, harga: hargaJual });
        total += qty * hargaJual;
      }

      const order = await prisma.orderB2B.create({
        data: {
          nomor, outletId, userId: user.id, agenId: agen.id,
          metodeBayar: "TRANSFER_QRIS", subtotal: total, total: total,
          statusBayar: "LUNAS",
          items: {
            create: itemData.map(it => ({
              produkJadiId: it.produkId, qty: it.qty, hargaSatuan: it.harga, subtotal: it.qty * it.harga,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of order.items) {
        await prisma.produkJadi.update({ where: { id: item.produkJadiId }, data: { stok: { decrement: item.qty } } });
        await prisma.stokMovementProdukJadi.create({
          data: { produkJadiId: item.produkJadiId, tipe: "OUT", qty: item.qty, sumber: "PENJUALAN_B2B", referensiId: order.id, tanggal, keterangan: `B2B ${nomor}` },
        });
      }
    }

    // =========================================================================
    // PENGELUARAN
    // =========================================================================
    const pengeluaranData = [
      { nama: "Sewa Tempat Produksi", nominal: 2500000, hari: 1, kategori: "OPERASIONAL" },
      { nama: "Listrik + Air", nominal: 450000, hari: 3, kategori: "OPERASIONAL" },
      { nama: "Gas Elpiji 3kg", nominal: 25000, hari: 4, kategori: "OPERASIONAL" },
      { nama: "Gas Elpiji 3kg", nominal: 25000, hari: 10, kategori: "OPERASIONAL" },
      { nama: "Gas Elpiji 3kg", nominal: 25000, hari: 16, kategori: "OPERASIONAL" },
      { nama: "Instagram Ads", nominal: 200000, hari: 5, kategori: "MARKETING" },
      { nama: "Brosur + Stiker", nominal: 150000, hari: 8, kategori: "MARKETING" },
      { nama: "Biaya Packaging Kardus", nominal: 85000, hari: 6, kategori: "OPERASIONAL" },
      { nama: "Transport Kirim Order", nominal: 75000, hari: 7, kategori: "OPERASIONAL" },
      { nama: "Transport Kirim Order", nominal: 50000, hari: 14, kategori: "OPERASIONAL" },
      { nama: "Influencer Micro", nominal: 300000, hari: 12, kategori: "MARKETING" },
      { nama: "Alat Cleanup Botol", nominal: 45000, hari: 9, kategori: "OPERASIONAL" },
    ];

    for (const pe of pengeluaranData) {
      await prisma.pengeluaran.create({
        data: {
          kategori: pe.nama, jumlah: pe.nominal, tanggal: d(8, pe.hari),
          keterangan: pe.nama, outletId, userId: user.id,
        },
      });
    }

    // =========================================================================
    // SUMMARY — hitung stok akhir
    // =========================================================================
    const summary = {
      supplier: suppliers.length,
      bahanBaku: bahanBaku.length,
      kemasan: kemasan.length,
      customer: customers.length,
      agen: agens.length,
      produkJadi: produkJadi.length,
      pembelian: pembelianData.length,
      proses: prosesList.length,
      output: outputData.length,
      pos: posData.length,
      b2b: b2bData.length,
      pengeluaran: pengeluaranData.length,
    };

    return NextResponse.json({
      ok: true,
      message: "Data dummy UMKM Chili Oil berhasil diisi!",
      summary,
    });
  } catch (error) {
    if (error instanceof ResetDataError) {
      return NextResponse.json({ error: error.message, type: "validation" }, { status: 400 });
    }
    console.error("[api/seed-dummy]", error);
    return apiError(error);
  }
});
