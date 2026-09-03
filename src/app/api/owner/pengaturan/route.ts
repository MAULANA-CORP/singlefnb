import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwner, catatAudit, apiError } from "@/lib/api-helpers";

// GET /api/owner/pengaturan — baca (dan buat kalau belum ada) baris Pengaturan singleton.
export const GET = withOwner(async () => {
  try {
    const pengaturan = await getPrisma().pengaturan.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
    return NextResponse.json({ pengaturan });
  } catch (error) {
    return apiError(error);
  }
});

// PATCH /api/owner/pengaturan — ubah nama toko/brand & logo (URL string, belum ada upload file).
export const PATCH = withOwner(async (user, req) => {
  try {
    const body = await req.json();
    const namaToko = String(body?.namaToko ?? "").trim();
    const logoUrl = typeof body?.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null;

    if (!namaToko) {
      return NextResponse.json({ error: "Nama toko wajib diisi" }, { status: 400 });
    }

    const pengaturan = await getPrisma().pengaturan.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", namaToko, logoUrl },
      update: { namaToko, logoUrl },
    });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Pengaturan",
      entitasId: pengaturan.id,
      detail: { namaToko, logoUrl },
    });

    return NextResponse.json({ pengaturan });
  } catch (error) {
    return apiError(error);
  }
});
