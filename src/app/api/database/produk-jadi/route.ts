import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withAuth, withOwner, apiError, catatAudit } from "@/lib/api-helpers";

function serialize(item: {
  id: string;
  nama: string;
  satuan: string;
  beratBersih: number | null;
  harga: unknown;
  stok: unknown;
  stokMinimum: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    nama: item.nama,
    satuan: item.satuan,
    beratBersih: item.beratBersih,
    harga: Number(item.harga),
    stok: Number(item.stok),
    stokMinimum: Number(item.stokMinimum),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toBeratBersih(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : null;
}

// GET /api/database/produk-jadi?search= — semua role login bisa lihat
export const GET = withAuth(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const items = await getPrisma().produkJadi.findMany({ take: 200, where: search ? { nama: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ items: items.map(serialize) });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/database/produk-jadi — hanya OWNER
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    const satuan = String(body?.satuan ?? "").trim() || "pcs";

    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

    const dup = await getPrisma().produkJadi.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" } },
    });
    if (dup) {
      return NextResponse.json({ error: "Nama produk jadi sudah dipakai" }, { status: 400 });
    }

    const item = await getPrisma().produkJadi.create({
      data: {
        nama,
        satuan,
        beratBersih: toBeratBersih(body.beratBersih),
        harga: Number(body.harga ?? 0),
        stok: Number(body.stok ?? 0),
        stokMinimum: Number(body.stokMinimum ?? 0),
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "ProdukJadi",
      entitasId: item.id,
      detail: { nama: item.nama },
    });

    return NextResponse.json({ item: serialize(item) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
