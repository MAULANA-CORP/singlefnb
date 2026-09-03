import { NextResponse } from "next/server";
import { withRole, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/inventory/produk-jadi/movement — riwayat pergerakan stok Produk Jadi */
export const GET = withRole(["OWNER", "FINANCE", "SALES", "PRODUKSI"], async (_user, req) => {
  try {
    const prisma = getPrisma();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const tipe = searchParams.get("tipe");
    const sumber = searchParams.get("sumber");
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");

    const where: Record<string, unknown> = {};
    if (itemId) where.produkJadiId = itemId;
    if (tipe === "IN" || tipe === "OUT") where.tipe = tipe;
    if (sumber) where.sumber = sumber;
    if (dari || sampai) {
      const rentang: Record<string, Date> = {};
      if (dari) rentang.gte = new Date(dari);
      if (sampai) rentang.lte = new Date(`${sampai}T23:59:59`);
      where.tanggal = rentang;
    }

    const movements = await prisma.stokMovementProdukJadi.findMany({
      where,
      orderBy: { tanggal: "desc" },
      take: 300,
      include: { produkJadi: { select: { id: true, nama: true, satuan: true } } },
    });

    const data = movements.map((m) => ({
      id: m.id,
      item: m.produkJadi,
      tipe: m.tipe,
      qty: Number(m.qty),
      sumber: m.sumber,
      referensiId: m.referensiId,
      tanggal: m.tanggal,
      keterangan: m.keterangan,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});
