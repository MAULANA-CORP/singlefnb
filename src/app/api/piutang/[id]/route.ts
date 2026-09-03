import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError } from "@/lib/api-helpers";
import { serializePiutang, serializePembayaran } from "@/lib/utang-piutang";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/piutang/:id — detail + riwayat cicilan (Pembayaran), untuk dialog pembayaran.
export const GET = withRole(["OWNER", "FINANCE", "SALES"], async (user, _req, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const piutang = await getPrisma().piutang.findUnique({
      where: { id },
      include: {
        orderPOS: { select: { nomor: true, userId: true, outlet: { select: { nama: true } } } },
        orderB2B: { select: { nomor: true, userId: true, outlet: { select: { nama: true } } } },
        pembayaran: { orderBy: { tanggal: "desc" }, include: { user: { select: { nama: true } } } },
      },
    });
    if (!piutang) {
      return NextResponse.json({ error: "Piutang tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "SALES") {
      const pemilik = piutang.orderPOS?.userId ?? piutang.orderB2B?.userId;
      if (pemilik !== user.id) {
        return NextResponse.json(
          { error: "Anda tidak punya akses ke piutang ini" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      data: {
        ...serializePiutang(piutang),
        riwayatPembayaran: piutang.pembayaran.map(serializePembayaran),
      },
    });
  } catch (error) {
    return apiError(error);
  }
});
