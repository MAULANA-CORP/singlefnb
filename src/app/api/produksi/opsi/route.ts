import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/produksi/opsi — data dropdown untuk form batch produksi (outlet, bahan baku, kemasan, produk jadi) */
export const GET = withOwnerProduksi(async () => {
  try {
    const prisma = getPrisma();
    const [outlets, bahanBaku, kemasan, produkJadi] = await Promise.all([
      prisma.outlet.findMany({ take: 200, where: { isActive: true },
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      }),
      prisma.bahanBaku.findMany({ take: 200, orderBy: { nama: "asc" },
        select: { id: true, nama: true, satuan: true, stok: true },
      }),
      prisma.kemasan.findMany({ take: 200, orderBy: { nama: "asc" },
        select: { id: true, nama: true, satuan: true, stok: true },
      }),
      prisma.produkJadi.findMany({ take: 200, orderBy: { nama: "asc" },
        select: { id: true, nama: true, satuan: true, beratBersih: true, stok: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        outlets,
        bahanBaku: bahanBaku.map((b) => ({ ...b, stok: Number(b.stok) })),
        kemasan: kemasan.map((k) => ({ ...k, stok: Number(k.stok) })),
        produkJadi: produkJadi.map((p) => ({ ...p, stok: Number(p.stok) })),
      },
    });
  } catch (error) {
    return apiError(error);
  }
});
