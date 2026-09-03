import { NextResponse } from "next/server";
import { withRole, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/inventory/produk-jadi — stok berjalan Produk Jadi (filter: q, lowStock=true) */
export const GET = withRole(["OWNER", "FINANCE", "SALES", "PRODUKSI"], async (_user, req) => {
  try {
    const prisma = getPrisma();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const items = await prisma.produkJadi.findMany({ take: 200, where: q ? { nama: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { nama: "asc" },
    });

    const data = items
      .map((i) => {
        const stok = Number(i.stok);
        const stokMinimum = Number(i.stokMinimum);
        return {
          id: i.id,
          nama: i.nama,
          satuan: i.satuan,
          beratBersih: i.beratBersih,
          harga: Number(i.harga),
          stok,
          stokMinimum,
          lowStock: stokMinimum > 0 && stok <= stokMinimum,
        };
      })
      .filter((i) => (lowStockOnly ? i.lowStock : true));

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});
