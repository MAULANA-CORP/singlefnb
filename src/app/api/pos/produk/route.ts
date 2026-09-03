import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError } from "@/lib/api-helpers";

// GET /api/pos/produk — daftar Produk Jadi (id, nama, harga, stok) untuk baris
// item order POS. Read-only, hidup di dalam scope modul POS supaya tidak
// bentrok dengan endpoint Database yang mungkin dibuat modul lain.
export const GET = withRole(["OWNER", "SALES", "FINANCE"], async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const produk = await getPrisma().produkJadi.findMany({
      where: search ? { nama: { contains: search, mode: "insensitive" } } : undefined,
      select: { id: true, nama: true, satuan: true, harga: true, stok: true },
      orderBy: { nama: "asc" },
      take: 100,
    });

    return NextResponse.json({
      produk: produk.map((p) => ({
        id: p.id,
        nama: p.nama,
        satuan: p.satuan,
        harga: Number(p.harga),
        stok: Number(p.stok),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
});
