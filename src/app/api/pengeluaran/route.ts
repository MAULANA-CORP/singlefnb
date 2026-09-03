import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";
import { parseTanggalAwal, parseTanggalAkhir } from "@/lib/period";

function serializePengeluaran(p: {
  id: string;
  outletId: string | null;
  userId: string;
  kategori: string;
  jumlah: unknown;
  tanggal: Date;
  keterangan: string | null;
  createdAt: Date;
  outlet?: { nama: string } | null;
  user?: { nama: string } | null;
}) {
  return {
    id: p.id,
    outletId: p.outletId,
    namaOutlet: p.outlet?.nama ?? null,
    userId: p.userId,
    namaUser: p.user?.nama ?? "",
    kategori: p.kategori,
    jumlah: Number(p.jumlah),
    tanggal: p.tanggal,
    keterangan: p.keterangan,
    createdAt: p.createdAt,
  };
}

// GET /api/pengeluaran — daftar Pengeluaran, filter kategori/periode/outlet
export const GET = withOwnerFinance(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const kategori = searchParams.get("kategori");
    const outletId = searchParams.get("outletId");
    const start = parseTanggalAwal(searchParams.get("start"));
    const end = parseTanggalAkhir(searchParams.get("end"));
    const search = searchParams.get("search")?.trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (kategori) where.kategori = kategori;
    if (outletId) where.outletId = outletId;
    if (start || end) {
      where.tanggal = {};
      if (start) where.tanggal.gte = start;
      if (end) where.tanggal.lte = end;
    }
    if (search) {
      where.OR = [
        { kategori: { contains: search, mode: "insensitive" } },
        { keterangan: { contains: search, mode: "insensitive" } },
      ];
    }

    const list = await getPrisma().pengeluaran.findMany({
      where,
      include: { outlet: { select: { nama: true } }, user: { select: { nama: true } } },
      orderBy: { tanggal: "desc" },
      take: 500,
    });

    const total = list.reduce((s, p) => s + Number(p.jumlah), 0);

    return NextResponse.json({ pengeluaran: list.map(serializePengeluaran), total });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/pengeluaran — catat beban operasional baru
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const kategori = typeof body.kategori === "string" ? body.kategori.trim() : "";
    const jumlah = Number(body.jumlah);
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const outletId = body.outletId || null;
    const keterangan = typeof body.keterangan === "string" ? body.keterangan.trim() || null : null;

    if (!kategori) {
      return NextResponse.json({ error: "Kategori wajib diisi", type: "validation" }, { status: 400 });
    }
    if (!(jumlah > 0)) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0", type: "validation" }, { status: 400 });
    }
    if (Number.isNaN(tanggal.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid", type: "validation" }, { status: 400 });
    }

    const created = await getPrisma().pengeluaran.create({
      data: { kategori, jumlah, tanggal, outletId, keterangan, userId: user.id },
      include: { outlet: { select: { nama: true } }, user: { select: { nama: true } } },
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Pengeluaran",
      entitasId: created.id,
      detail: { kategori, jumlah },
    });

    return NextResponse.json({ pengeluaran: serializePengeluaran(created) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
