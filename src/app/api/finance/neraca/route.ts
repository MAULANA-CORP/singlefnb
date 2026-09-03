import { NextResponse } from "next/server";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";
import { hitungNeraca } from "@/lib/finance";
import { akhirHariIni, parseTanggalTitik } from "@/lib/period";

// GET /api/finance/neraca?asOf=YYYY-MM-DD&outletId=...
export const GET = withOwnerFinance(async (user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const asOf = parseTanggalTitik(searchParams.get("asOf")) ?? akhirHariIni();
    const outletId = searchParams.get("outletId") || undefined;

    const hasil = await hitungNeraca(asOf, outletId);

    if (searchParams.get("export") === "1") {
      await catatAudit({
        userId: user.id,
        aksi: "EXPORT",
        entitas: "Neraca",
        detail: { asOf: asOf.toISOString(), outletId: outletId ?? null },
      });
    }

    return NextResponse.json(hasil);
  } catch (error) {
    return apiError(error);
  }
});
