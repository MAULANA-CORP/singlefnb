import { NextResponse } from "next/server";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";
import { hitungNilaiStok } from "@/lib/finance";

// GET /api/report/stok — level stok saat ini lintas Bahan Baku/Kemasan/Produk Jadi + nilai
export const GET = withOwnerFinance(async (user, req) => {
  try {
    const hasil = await hitungNilaiStok();

    const { searchParams } = new URL(req.url);
    if (searchParams.get("export") === "1") {
      await catatAudit({ userId: user.id, aksi: "EXPORT", entitas: "LaporanStok" });
    }

    return NextResponse.json(hasil);
  } catch (error) {
    return apiError(error);
  }
});
