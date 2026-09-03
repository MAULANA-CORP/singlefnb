import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError } from "@/lib/api-helpers";
import { serializePiutang } from "@/lib/utang-piutang";

// GET /api/piutang — list + filter. Piutang dibuat otomatis oleh modul POS/B2B,
// di sini hanya dibaca (dan nanti dibayar lewat /api/piutang/:id/pembayaran).
// SALES cuma boleh lihat piutang dari order yang dia sendiri buat (query-time filter).
export const GET = withRole(["OWNER", "FINANCE", "SALES"], async (user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const pihak = searchParams.get("pihak")?.trim();
    const outletId = searchParams.get("outletId");
    const jatuhTempoDari = searchParams.get("jatuhTempoDari");
    const jatuhTempoSampai = searchParams.get("jatuhTempoSampai");
    const tanggalDari = searchParams.get("tanggalDari");
    const tanggalSampai = searchParams.get("tanggalSampai");
    const hanyaOverdue = searchParams.get("overdue") === "1";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (pihak) where.pihakNama = { contains: pihak, mode: "insensitive" };
    if (jatuhTempoDari || jatuhTempoSampai) {
      where.jatuhTempo = {};
      if (jatuhTempoDari) where.jatuhTempo.gte = new Date(jatuhTempoDari);
      if (jatuhTempoSampai) where.jatuhTempo.lte = new Date(jatuhTempoSampai);
    }
    if (tanggalDari || tanggalSampai) {
      where.createdAt = {};
      if (tanggalDari) where.createdAt.gte = new Date(tanggalDari);
      if (tanggalSampai) where.createdAt.lte = new Date(tanggalSampai);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andFilters: Record<string, any>[] = [];
    if (outletId) {
      andFilters.push({ OR: [{ orderPOS: { outletId } }, { orderB2B: { outletId } }] });
    }
    if (user.role === "SALES") {
      andFilters.push({
        OR: [{ orderPOS: { userId: user.id } }, { orderB2B: { userId: user.id } }],
      });
    }
    if (andFilters.length) where.AND = andFilters;

    const piutang = await getPrisma().piutang.findMany({ take: 200, where,
      include: {
        orderPOS: { select: { nomor: true, outlet: { select: { nama: true } } } },
        orderB2B: { select: { nomor: true, outlet: { select: { nama: true } } } },
      },
      orderBy: { jatuhTempo: "asc" },
    });

    let data = piutang.map(serializePiutang);
    if (hanyaOverdue) {
      const now = Date.now();
      data = data.filter((p) => p.status !== "LUNAS" && new Date(p.jatuhTempo).getTime() < now);
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});
