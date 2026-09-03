import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance } from "@/lib/api-helpers";
import { serializeUtang, serializePembayaran } from "@/lib/utang-piutang";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/utang/:id — detail + riwayat cicilan (Pembayaran), untuk dialog pembayaran.
export const GET = withOwnerFinance(async (_user, _req, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const utang = await getPrisma().utang.findUnique({
      where: { id },
      include: {
        pembelian: { select: { nomor: true, outlet: { select: { nama: true } } } },
        pembayaran: { orderBy: { tanggal: "desc" }, include: { user: { select: { nama: true } } } },
      },
    });
    if (!utang) {
      return NextResponse.json({ error: "Utang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...serializeUtang(utang),
        riwayatPembayaran: utang.pembayaran.map(serializePembayaran),
      },
    });
  } catch (error) {
    console.error("[api/utang/:id GET]", error);
    return NextResponse.json({ error: "Gagal memuat detail utang" }, { status: 500 });
  }
});
