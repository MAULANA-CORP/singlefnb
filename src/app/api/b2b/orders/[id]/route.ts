import { NextResponse } from "next/server";
import { withRole, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/b2b";

/** Detail order B2B lengkap (item, invoice, surat jalan, piutang). View: Owner/Sales/Finance. */
export const GET = withRole(["OWNER", "SALES", "FINANCE"], async (_user, _req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;

    const order = await getPrisma().orderB2B.findUnique({
      where: { id },
      include: {
        agen: true,
        outlet: true,
        user: { select: { id: true, nama: true } },
        items: { include: { produkJadi: true } },
        invoice: true,
        suratJalan: true,
        piutang: { include: { pembayaran: { orderBy: { tanggal: "desc" } } } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data: serializeOrder(order) });
  } catch (error) {
    return apiError(error);
  }
});
