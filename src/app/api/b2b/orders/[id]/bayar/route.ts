import { NextResponse } from "next/server";
import { withOwnerSales, apiError } from "@/lib/api-helpers";
import { bayarOrder, serializeOrder, B2BError } from "@/lib/b2b";

/**
 * Catat pembayaran (bisa dicicil, sebelum atau setelah kirim). Owner/Sales.
 * Finance TIDAK punya akses tulis di sini — sesuai tabel Role & Akses PRD §7,
 * B2B write access hanya OWNER + SALES; Finance urus uang lewat Finance Room /
 * halaman Utang-Piutang (modul terpisah), bukan dengan mengubah Order B2B.
 */
export const POST = withOwnerSales(async (user, req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const order = await bayarOrder(user, id, {
      jumlah: Number(body.jumlah),
      metodeBayar: body.metodeBayar,
      tanggalJatuhTempo: body.tanggalJatuhTempo,
      catatan: body.catatan,
    });

    return NextResponse.json({ data: serializeOrder(order) });
  } catch (error) {
    if (error instanceof B2BError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
});
