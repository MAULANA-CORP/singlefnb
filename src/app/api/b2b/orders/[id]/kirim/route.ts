import { NextResponse } from "next/server";
import { withOwnerSales, apiError } from "@/lib/api-helpers";
import { kirimOrder, serializeOrder, B2BError } from "@/lib/b2b";

/** Catat Surat Jalan + No. Resi -> status Dikirim. Owner/Sales. */
export const POST = withOwnerSales(async (user, req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const order = await kirimOrder(user, id, String(body.noResi ?? ""));
    return NextResponse.json({ data: serializeOrder(order) });
  } catch (error) {
    if (error instanceof B2BError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
});
