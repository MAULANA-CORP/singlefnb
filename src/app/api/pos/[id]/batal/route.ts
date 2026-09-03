import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api-helpers";
import { batalOrderPOS, PosError } from "@/lib/pos";

// POST /api/pos/:id/batal - Batalkan Order POS
export const POST = withAuth<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    await batalOrderPOS(user, id);
    return NextResponse.json({ success: true, message: "Order POS berhasil dibatalkan" });
  } catch (error) {
    if (error instanceof PosError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
});
