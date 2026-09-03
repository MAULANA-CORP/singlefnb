import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError, catatAudit } from "@/lib/api-helpers";

// Tulis Agen: OWNER + SALES (sama seperti POST di route.ts).
const WRITE_ROLES = ["OWNER", "SALES"] as const;

function isForeignKeyError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    ((error as { code: string }).code === "P2003" || (error as { code: string }).code === "P2014")
  );
}

// PUT /api/database/agen/:id — OWNER + SALES
export const PUT = withRole<{ params: Promise<{ id: string }> }>(
  [...WRITE_ROLES],
  async (user, req, ctx) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const nama = String(body?.nama ?? "").trim();
      if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

      const dup = await getPrisma().agen.findFirst({
        where: { nama: { equals: nama, mode: "insensitive" }, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json({ error: "Nama agen sudah dipakai" }, { status: 400 });
      }

      const item = await getPrisma().agen.update({
        where: { id },
        data: {
          nama,
          kontak: body.kontak ? String(body.kontak).trim() : null,
          alamat: body.alamat ? String(body.alamat).trim() : null,
        },
      });

      await catatAudit({
        userId: user.id,
        aksi: "UPDATE",
        entitas: "Agen",
        entitasId: item.id,
        detail: { nama: item.nama },
      });

      return NextResponse.json({ item, data: item });
    } catch (error) {
      return apiError(error);
    }
  }
);

// DELETE /api/database/agen/:id — OWNER + SALES
export const DELETE = withRole<{ params: Promise<{ id: string }> }>(
  [...WRITE_ROLES],
  async (user, _req, ctx) => {
    try {
      const { id } = await ctx.params;
      const existing = await getPrisma().agen.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
      }

      await getPrisma().agen.delete({ where: { id } });

      await catatAudit({
        userId: user.id,
        aksi: "DELETE",
        entitas: "Agen",
        entitasId: id,
        detail: { nama: existing.nama },
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      if (isForeignKeyError(error)) {
        return NextResponse.json(
          { error: "Tidak bisa dihapus, data ini masih dipakai di transaksi lain." },
          { status: 409 }
        );
      }
      return apiError(error);
    }
  }
);
