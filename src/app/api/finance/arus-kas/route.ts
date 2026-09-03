import { NextResponse } from "next/server";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";
import { hitungArusKas, hitungSeriHarianArusKas } from "@/lib/finance";
import { awalBulanIni, akhirHariIni, parseTanggalAwal, parseTanggalAkhir } from "@/lib/period";

// GET /api/finance/arus-kas?start=YYYY-MM-DD&end=YYYY-MM-DD&outletId=...
export const GET = withOwnerFinance(async (user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const start = parseTanggalAwal(searchParams.get("start")) ?? awalBulanIni();
    const end = parseTanggalAkhir(searchParams.get("end")) ?? akhirHariIni();
    const outletId = searchParams.get("outletId") || undefined;

    const [hasil, seriHarian] = await Promise.all([
      hitungArusKas({ start, end, outletId }),
      hitungSeriHarianArusKas({ start, end, outletId }),
    ]);

    if (searchParams.get("export") === "1") {
      await catatAudit({
        userId: user.id,
        aksi: "EXPORT",
        entitas: "ArusKas",
        detail: { start: start.toISOString(), end: end.toISOString(), outletId: outletId ?? null },
      });
    }

    return NextResponse.json({ ...hasil, seriHarian });
  } catch (error) {
    return apiError(error);
  }
});
