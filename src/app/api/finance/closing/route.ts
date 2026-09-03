import { NextResponse } from "next/server";
import { withRole, apiError, catatAudit } from "@/lib/api-helpers";
import { hitungSaldoKasKumulatif } from "@/lib/finance";

// POST /api/finance/closing - Proses Closing Kas Harian
export const POST = withRole(["OWNER", "FINANCE"], async (user, req) => {
  try {
    const body = await req.json();
    const { aktualKas, catatan } = body;

    if (aktualKas === undefined || typeof aktualKas !== "number") {
      return NextResponse.json({ error: "Nilai kas aktual (aktualKas) tidak valid" }, { status: 400 });
    }

    const asOf = new Date();
    const saldoSistem = await hitungSaldoKasKumulatif(asOf);
    const selisih = aktualKas - saldoSistem;

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Kas",
      entitasId: "CLOSING",
      detail: {
        saldoSistem,
        aktualKas,
        selisih,
        catatan,
        tanggal: asOf.toISOString(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Closing Kas berhasil dicatat",
      data: { saldoSistem, aktualKas, selisih }
    });
  } catch (error) {
    return apiError(error);
  }
});
