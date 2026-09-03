import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, apiError } from "@/lib/api-helpers";

// Preset kategori umum — selalu ditawarkan di SearchableSelect walau belum pernah dipakai.
export const KATEGORI_PRESET = ["GAJI", "SEWA", "LISTRIK_AIR", "TRANSPORTASI", "MARKETING", "LAINNYA"];

// GET /api/pengeluaran/kategori — gabungan preset + kategori custom yang pernah dipakai
export const GET = withOwnerFinance(async () => {
  try {
    const distinct = await getPrisma().pengeluaran.findMany({ take: 200, distinct: ["kategori"],
      select: { kategori: true },
      orderBy: { kategori: "asc" },
    });
    const dariDb = distinct.map((d) => d.kategori);
    const gabungan = [...new Set([...KATEGORI_PRESET, ...dariDb])];
    return NextResponse.json({ kategori: gabungan });
  } catch (error) {
    return apiError(error);
  }
});
