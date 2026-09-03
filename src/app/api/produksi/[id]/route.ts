import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/produksi/:id — detail batch + breakdown alokasi HPP */
export const GET = withOwnerProduksi(async (_user, _req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const prisma = getPrisma();

    const batch = await prisma.produksiBatch.findUnique({
      where: { id },
      include: {
        outlet: { select: { id: true, nama: true } },
        user: { select: { id: true, nama: true } },
        bahanBaku: {
          include: { bahanBaku: { select: { id: true, nama: true, satuan: true } } },
        },
        kemasan: {
          include: { kemasan: { select: { id: true, nama: true, satuan: true } } },
        },
        output: {
          include: {
            produkJadi: { select: { id: true, nama: true, satuan: true, beratBersih: true } },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch produksi tidak ditemukan." }, { status: 404 });
    }

    const totalBeratSemuaOutput = batch.output.reduce((sum, o) => {
      const berat = batch.output.length > 0 ? o.produkJadi.beratBersih ?? 1 : 1;
      return sum + berat * Number(o.qty);
    }, 0);

    const data = {
      id: batch.id,
      nomor: batch.nomor,
      tanggal: batch.tanggal,
      catatan: batch.catatan,
      totalBiaya: Number(batch.totalBiaya),
      outlet: batch.outlet,
      user: batch.user,
      bahanBaku: batch.bahanBaku.map((b) => ({
        id: b.id,
        bahanBaku: b.bahanBaku,
        qtyPakai: Number(b.qtyPakai),
        qtyWaste: Number(b.qtyWaste),
        hargaSatuanSaatItu: Number(b.hargaSatuanSaatItu),
        subtotal: Number(b.qtyPakai) * Number(b.hargaSatuanSaatItu),
      })),
      kemasan: batch.kemasan.map((k) => ({
        id: k.id,
        kemasan: k.kemasan,
        qtyPakai: Number(k.qtyPakai),
        hargaSatuanSaatItu: Number(k.hargaSatuanSaatItu),
        subtotal: Number(k.qtyPakai) * Number(k.hargaSatuanSaatItu),
      })),
      output: batch.output.map((o) => {
        const beratBersih = o.produkJadi.beratBersih;
        const beratFallback = beratBersih == null;
        const qty = Number(o.qty);
        const totalBerat = (beratBersih ?? 1) * qty;
        const hppAlokasi = Number(o.hppAlokasi);
        return {
          id: o.id,
          produkJadi: o.produkJadi,
          qty,
          totalBerat,
          beratFallback,
          hppAlokasi,
          hppPerUnit: qty > 0 ? hppAlokasi / qty : 0,
          porsiBerat: totalBeratSemuaOutput > 0 ? totalBerat / totalBeratSemuaOutput : 0,
        };
      }),
      totalBeratSemuaOutput,
    };

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});
