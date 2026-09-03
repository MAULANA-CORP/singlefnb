import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError, catatAudit } from "@/lib/api-helpers";

const WRITE_ROLES = ["OWNER", "SALES"] as const;

function serialize(item: {
  id: string;
  nama: string;
  kontak: string | null;
  alamat: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    nama: item.nama,
    kontak: item.kontak,
    alamat: item.alamat,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function isForeignKeyError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    ((error as { code: string }).code === "P2003" || (error as { code: string }).code === "P2014")
  );
}

// PUT /api/database/customers/:id — OWNER + SALES
export const PUT = withRole<{ params: Promise<{ id: string }> }>(
  [...WRITE_ROLES],
  async (user, req, ctx) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const nama = String(body?.nama ?? "").trim();
      if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

      const dup = await getPrisma().customer.findFirst({
        where: { nama: { equals: nama, mode: "insensitive" }, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json({ error: "Nama customer sudah dipakai" }, { status: 400 });
      }

      const item = await getPrisma().customer.update({
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
        entitas: "Customer",
        entitasId: item.id,
        detail: { nama: item.nama },
      });

      return NextResponse.json({ item: serialize(item) });
    } catch (error) {
      return apiError(error);
    }
  }
);

// DELETE /api/database/customers/:id — OWNER + SALES
export const DELETE = withRole<{ params: Promise<{ id: string }> }>(
  [...WRITE_ROLES],
  async (user, _req, ctx) => {
    try {
      const { id } = await ctx.params;
      const existing = await getPrisma().customer.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
      }

      await getPrisma().customer.delete({ where: { id } });

      await catatAudit({
        userId: user.id,
        aksi: "DELETE",
        entitas: "Customer",
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
