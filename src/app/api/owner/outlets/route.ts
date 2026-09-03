import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwner, catatAudit, apiError } from "@/lib/api-helpers";

// GET /api/owner/outlets — semua outlet (aktif & nonaktif) untuk dikelola di Owner Room.
export const GET = withOwner(async () => {
  try {
    const outlets = await getPrisma().outlet.findMany({ take: 200, orderBy: { nama: "asc" } });
    return NextResponse.json({ outlets });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/owner/outlets — tambah outlet/cabang baru.
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    const alamat = typeof body?.alamat === "string" && body.alamat.trim() ? body.alamat.trim() : null;

    if (!nama) {
      return NextResponse.json({ error: "Nama outlet wajib diisi" }, { status: 400 });
    }

    const outlet = await getPrisma().outlet.create({ data: { nama, alamat } });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Outlet",
      entitasId: outlet.id,
      detail: { nama, alamat },
    });

    return NextResponse.json({ outlet }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
