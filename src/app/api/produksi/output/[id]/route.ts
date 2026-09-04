import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/produksi/output/:id — detail output + breakdown HPP */
export const GET = withOwnerProduksi(async (_user, _req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const prisma = getPrisma();

    const output = await prisma.output.findUnique({
      where: { id },
      include: {
        outlet: { select: { id: true, nama: true } },
        user: { select: { id: true, nama: true } },
        proses: {
          include: {
            proses: {
              select: { id: true, nomor: true, nama: true, status: true, tanggal: true },
            },
          },
        },
        produkJadi: {
          include: {
            produkJadi: { select: { id: true, nama: true, satuan: true, beratBersih: true } },
          },
        },
        kemasan: {
          include: { kemasan: { select: { id: true, nama: true, satuan: true } } },
        },
      },
    });

    if (!output) {
      return NextResponse.json({ error: "Output tidak ditemukan." }, { status: 404 });
    }

    // Hitung total biaya kemasan
    const totalBiayaKemasan = output.kemasan.reduce(
      (sum, k) => sum + Number(k.qtyPakai) * Number(k.hargaSatuanSaatItu),
      0
    );

    // Total biaya = totalBiaya di record (sudah termasuk proses + kemasan)
    const totalBiaya = Number(output.totalBiaya);
    const totalBiayaProses = totalBiaya - totalBiayaKemasan;

    // Hitung total berat semua output
    const totalBeratSemuaOutput = output.produkJadi.reduce((sum, o) => {
      const beratBersih = o.produkJadi.beratBersih;
      const berat = (beratBersih ?? 1) * Number(o.qty);
      return sum + berat;
    }, 0);

    const data = {
      id: output.id,
      nomor: output.nomor,
      tanggal: output.tanggal,
      catatan: output.catatan,
      totalBiaya,
      totalBiayaProses,
      totalBiayaKemasan,
      outlet: output.outlet,
      user: output.user,
      proses: output.proses.map((op) => ({
        id: op.proses.id,
        nomor: op.proses.nomor,
        nama: op.proses.nama,
        status: op.proses.status,
        tanggal: op.proses.tanggal,
      })),
      kemasan: output.kemasan.map((k) => ({
        id: k.id,
        kemasan: k.kemasan,
        qtyPakai: Number(k.qtyPakai),
        hargaSatuanSaatItu: Number(k.hargaSatuanSaatItu),
        subtotal: Number(k.qtyPakai) * Number(k.hargaSatuanSaatItu),
      })),
      produkJadi: output.produkJadi.map((o) => {
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
