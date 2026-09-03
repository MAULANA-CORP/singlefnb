import { NextResponse } from "next/server";
import { withOwnerFinance } from "@/lib/api-helpers";
import { rekamPembayaran, UtangPiutangError } from "@/lib/utang-piutang";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/piutang/:id/pembayaran — catat cicilan/pelunasan Piutang.
// SALES tidak boleh mencatat pembayaran (view-only), jadi endpoint ini OWNER+FINANCE saja.
export const POST = withOwnerFinance(async (user, req, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const jumlah = Number(body.jumlah);

    const result = await rekamPembayaran(user, {
      tipe: "PIUTANG",
      id,
      jumlah,
      catatan: body.catatan ?? null,
      tanggal: body.tanggal ?? undefined,
    });

    return NextResponse.json({
      data: {
        pembayaranId: result.pembayaran.id,
        totalTerbayar: Number(result.parent.totalTerbayar),
        status: result.parent.status,
      },
    });
  } catch (error) {
    if (error instanceof UtangPiutangError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/piutang/pembayaran]", error);
    return NextResponse.json({ error: "Gagal mencatat pembayaran" }, { status: 500 });
  }
});
