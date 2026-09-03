import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError } from "@/lib/api-helpers";
import { serializeOrderPOS } from "@/lib/pos";

// GET /api/pos/:id — detail order POS (OWNER/SALES/FINANCE bisa lihat)
export const GET = withRole<{ params: Promise<{ id: string }> }>(
  ["OWNER", "SALES", "FINANCE"],
  async (_user, _req, ctx) => {
    try {
      const { id } = await ctx.params;
      const order = await getPrisma().orderPOS.findUnique({
        where: { id },
        include: {
          customer: true,
          outlet: true,
          user: true,
          items: { include: { produkJadi: true } },
          piutang: true,
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ order: serializeOrderPOS(order) });
    } catch (error) {
      return apiError(error);
    }
  }
);
