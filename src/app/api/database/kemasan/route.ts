import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withAuth, withOwner, apiError, catatAudit } from "@/lib/api-helpers";

function serialize(item: {
  id: string;
  nama: string;
  satuan: string;
  stok: unknown;
  stokMinimum: unknown;
  harga: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    nama: item.nama,
    satuan: item.satuan,
    stok: Number(item.stok),
    stokMinimum: Number(item.stokMinimum),
    harga: Number(item.harga),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// GET /api/database/kemasan?search= — semua role login bisa lihat
export const GET = withAuth(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const items = await getPrisma().kemasan.findMany({ take: 200, where: search ? { nama: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ items: items.map(serialize) });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/database/kemasan — hanya OWNER
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    const satuan = String(body?.satuan ?? "").trim();

    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!satuan) return NextResponse.json({ error: "Satuan wajib diisi" }, { status: 400 });

    const dup = await getPrisma().kemasan.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" } },
    });
    if (dup) {
      return NextResponse.json({ error: "Nama kemasan sudah dipakai" }, { status: 400 });
    }

    const item = await getPrisma().kemasan.create({
      data: {
        nama,
        satuan,
        stok: Number(body.stok ?? 0),
        stokMinimum: Number(body.stokMinimum ?? 0),
        harga: Number(body.harga ?? 0),
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Kemasan",
      entitasId: item.id,
      detail: { nama: item.nama },
    });

    return NextResponse.json({ item: serialize(item) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
