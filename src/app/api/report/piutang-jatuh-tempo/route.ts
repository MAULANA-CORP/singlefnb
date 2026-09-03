import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";
import { hariOverdue } from "@/lib/utils";

// GET /api/report/piutang-jatuh-tempo — semua Piutang belum lunas + hari overdue.
// >30 hari overdue ditandai `overdue30` (PRD §7 poin 4).
export const GET = withOwnerFinance(async (user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const hanyaOverdue = searchParams.get("hanyaOverdue") === "1";

    const list = await getPrisma().piutang.findMany({ take: 200, where: { status: { not: "LUNAS" } },
      include: {
        orderPOS: { select: { nomor: true, outlet: { select: { nama: true } } } },
        orderB2B: { select: { nomor: true, outlet: { select: { nama: true } } } },
      },
      orderBy: { jatuhTempo: "asc" },
    });

    let baris = list.map((p) => {
      const hari = hariOverdue(p.jatuhTempo);
      return {
        id: p.id,
        sumber: p.orderPOS ? "POS" : "B2B",
        nomor: p.orderPOS?.nomor ?? p.orderB2B?.nomor ?? "-",
        outlet: p.orderPOS?.outlet.nama ?? p.orderB2B?.outlet.nama ?? "-",
        pihakNama: p.pihakNama,
        totalTagihan: Number(p.totalTagihan),
        totalTerbayar: Number(p.totalTerbayar),
        sisa: Number(p.totalTagihan) - Number(p.totalTerbayar),
        jatuhTempo: p.jatuhTempo,
        status: p.status,
        hariOverdue: hari,
        overdue30: hari > 30,
      };
    });

    if (hanyaOverdue) baris = baris.filter((b) => b.overdue30);

    if (searchParams.get("export") === "1") {
      await catatAudit({ userId: user.id, aksi: "EXPORT", entitas: "LaporanPiutangJatuhTempo" });
    }

    return NextResponse.json({
      baris,
      totalSisa: baris.reduce((s, b) => s + b.sisa, 0),
      jumlahOverdue30: baris.filter((b) => b.overdue30).length,
    });
  } catch (error) {
    return apiError(error);
  }
});
