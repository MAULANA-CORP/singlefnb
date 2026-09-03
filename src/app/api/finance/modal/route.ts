import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";

const TIPE_VALID = ["MODAL_AWAL", "PENAMBAHAN", "PRIVE"] as const;
const SUMBER_DANA_VALID = ["UANG_SENDIRI", "PINJAMAN", "INVESTOR"] as const;

function serializeModal(m: {
  id: string;
  tipe: string;
  sumberDana: string | null;
  jumlah: unknown;
  tanggal: Date;
  keterangan: string | null;
  userId: string;
  createdAt: Date;
  user?: { nama: string } | null;
}) {
  return {
    id: m.id,
    tipe: m.tipe,
    sumberDana: m.sumberDana,
    jumlah: Number(m.jumlah),
    tanggal: m.tanggal,
    keterangan: m.keterangan,
    userId: m.userId,
    namaUser: m.user?.nama ?? "",
    createdAt: m.createdAt,
  };
}

// GET /api/finance/modal — daftar entri Modal (Modal Awal / Penambahan / Prive)
export const GET = withOwnerFinance(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const tipe = searchParams.get("tipe");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (tipe && (TIPE_VALID as readonly string[]).includes(tipe)) where.tipe = tipe;
    if (start || end) {
      where.tanggal = {};
      if (start) where.tanggal.gte = new Date(start);
      if (end) {
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);
        where.tanggal.lte = e;
      }
    }

    const entries = await getPrisma().modal.findMany({
      where,
      include: { user: { select: { nama: true } } },
      orderBy: { tanggal: "desc" },
      take: 500,
    });

    return NextResponse.json({ modal: entries.map(serializeModal) });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/finance/modal — tambah entri Modal baru
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const tipe = body.tipe;
    const jumlah = Number(body.jumlah);
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const keterangan = typeof body.keterangan === "string" ? body.keterangan.trim() || null : null;
    let sumberDana: string | null = body.sumberDana ?? null;

    if (!(TIPE_VALID as readonly string[]).includes(tipe)) {
      return NextResponse.json({ error: "Tipe modal tidak valid", type: "validation" }, { status: 400 });
    }
    if (!(jumlah > 0)) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0", type: "validation" }, { status: 400 });
    }
    if (Number.isNaN(tanggal.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid", type: "validation" }, { status: 400 });
    }
    if (tipe === "PENAMBAHAN") {
      if (!sumberDana || !(SUMBER_DANA_VALID as readonly string[]).includes(sumberDana)) {
        return NextResponse.json(
          { error: "Sumber dana wajib dipilih untuk Penambahan Modal", type: "validation" },
          { status: 400 }
        );
      }
    } else {
      sumberDana = null;
    }

    const created = await getPrisma().modal.create({
      data: { tipe, sumberDana: sumberDana as never, jumlah, tanggal, keterangan, userId: user.id },
      include: { user: { select: { nama: true } } },
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Modal",
      entitasId: created.id,
      detail: { tipe, jumlah, sumberDana },
    });

    return NextResponse.json({ modal: serializeModal(created) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
