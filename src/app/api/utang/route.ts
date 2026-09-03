import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance } from "@/lib/api-helpers";
import { serializeUtang, buatUtangStandalone, UtangPiutangError } from "@/lib/utang-piutang";

// GET /api/utang — list + filter. OWNER & FINANCE saja (SALES tidak punya akses tab Utang).
export const GET = withOwnerFinance(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const sumber = searchParams.get("sumber");
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
    if (sumber) where.sumber = sumber;
    if (pihak) where.pihakNama = { contains: pihak, mode: "insensitive" };
    if (outletId) where.pembelian = { outletId };
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

    const utang = await getPrisma().utang.findMany({ take: 200, where,
      include: { pembelian: { select: { nomor: true, outlet: { select: { nama: true } } } } },
      orderBy: { jatuhTempo: "asc" },
    });

    let data = utang.map(serializeUtang);
    if (hanyaOverdue) {
      const now = Date.now();
      data = data.filter((u) => u.status !== "LUNAS" && new Date(u.jatuhTempo).getTime() < now);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[api/utang GET]", error);
    return NextResponse.json({ error: "Gagal memuat data utang" }, { status: 500 });
  }
});

// POST /api/utang — catat Utang standalone (Pinjaman/Investor), tanpa Pembelian.
// Utang bersumber PEMBELIAN dibuat lewat POST /api/pembelian, bukan di sini.
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const utang = await buatUtangStandalone(user, {
      sumber: body.sumber,
      pihakNama: String(body.pihakNama ?? ""),
      jumlah: Number(body.jumlah),
      jatuhTempo: String(body.jatuhTempo ?? ""),
      keterangan: body.keterangan ?? null,
    });
    return NextResponse.json({ data: serializeUtang(utang) });
  } catch (error) {
    if (error instanceof UtangPiutangError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/utang POST]", error);
    return NextResponse.json({ error: "Gagal mencatat utang" }, { status: 500 });
  }
});
