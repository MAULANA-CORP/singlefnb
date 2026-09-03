import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwner, apiError, catatAudit } from "@/lib/api-helpers";

function serialize(item: {
  id: string;
  nama: string;
  satuan: string;
  stok: unknown;
  stokMinimum: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    nama: item.nama,
    satuan: item.satuan,
    stok: Number(item.stok),
    stokMinimum: Number(item.stokMinimum),
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

// PUT /api/database/kemasan/:id — hanya OWNER
export const PUT = withOwner<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    const satuan = String(body?.satuan ?? "").trim();

    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!satuan) return NextResponse.json({ error: "Satuan wajib diisi" }, { status: 400 });

    const dup = await getPrisma().kemasan.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" }, NOT: { id } },
    });
    if (dup) {
      return NextResponse.json({ error: "Nama kemasan sudah dipakai" }, { status: 400 });
    }

    const item = await getPrisma().kemasan.update({
      where: { id },
      data: {
        nama,
        satuan,
        stok: Number(body.stok ?? 0),
        stokMinimum: Number(body.stokMinimum ?? 0),
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Kemasan",
      entitasId: item.id,
      detail: { nama: item.nama },
    });

    return NextResponse.json({ item: serialize(item) });
  } catch (error) {
    return apiError(error);
  }
});

// DELETE /api/database/kemasan/:id — hanya OWNER
export const DELETE = withOwner<{ params: Promise<{ id: string }> }>(async (user, _req, ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await getPrisma().kemasan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    await getPrisma().kemasan.delete({ where: { id } });

    await catatAudit({
      userId: user.id,
      aksi: "DELETE",
      entitas: "Kemasan",
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
});
