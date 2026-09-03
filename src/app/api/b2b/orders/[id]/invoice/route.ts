import { NextResponse } from "next/server";
import { withOwnerSales, apiError } from "@/lib/api-helpers";
import { terbitkanInvoice, serializeOrder, B2BError } from "@/lib/b2b";

/** DRAFT -> Invoice diterbitkan. Owner/Sales. */
export const POST = withOwnerSales(async (user, _req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const order = await terbitkanInvoice(user, id);
    return NextResponse.json({ data: serializeOrder(order) });
  } catch (error) {
    if (error instanceof B2BError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
});
