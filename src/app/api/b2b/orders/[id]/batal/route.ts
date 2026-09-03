import { NextResponse } from "next/server";
import { withOwnerSales, apiError } from "@/lib/api-helpers";
import { batalOrder, serializeOrder, B2BError } from "@/lib/b2b";

/** Batalkan order — hanya sebelum dikirim/dibayar. Mengembalikan stok. Owner/Sales. */
export const POST = withOwnerSales(async (user, req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const order = await batalOrder(user, id, body?.alasan);
    return NextResponse.json({ data: serializeOrder(order) });
  } catch (error) {
    if (error instanceof B2BError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
});
