import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwner, catatAudit, apiError } from "@/lib/api-helpers";

// PATCH /api/owner/outlets/:id — edit nama/alamat, atau aktifkan/nonaktifkan outlet.
export const PATCH = withOwner<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const data: { nama?: string; alamat?: string | null; isActive?: boolean } = {};

    if (typeof body?.nama === "string") {
      const nama = body.nama.trim();
      if (!nama) return NextResponse.json({ error: "Nama outlet wajib diisi" }, { status: 400 });
      data.nama = nama;
    }
    if ("alamat" in body) {
      data.alamat = typeof body.alamat === "string" && body.alamat.trim() ? body.alamat.trim() : null;
    }
    if (typeof body?.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim" }, { status: 400 });
    }

    const outlet = await getPrisma().outlet.update({ where: { id }, data });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Outlet",
      entitasId: outlet.id,
      detail: data,
    });

    return NextResponse.json({ outlet });
  } catch (error) {
    return apiError(error);
  }
});
