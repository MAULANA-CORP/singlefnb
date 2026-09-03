import { NextResponse } from "next/server";
import { withOwner, apiError } from "@/lib/api-helpers";
import { resetDataAsli, ResetDataError } from "@/lib/reset-data";

// POST /api/owner/reset-data — hard-delete SELURUH data transaksi.
// OWNER-only (dijaga withOwner, bukan cuma UI), wajib body { konfirmasi: "RESET ASLI" | "HAPUS ASLI" }.
// Lihat src/lib/reset-data.ts untuk detail urutan penghapusan & alasannya.
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json().catch(() => ({}));
    await resetDataAsli(user, body?.konfirmasi);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ResetDataError) {
      return NextResponse.json({ error: error.message, type: "validation" }, { status: 400 });
    }
    return apiError(error);
  }
});
