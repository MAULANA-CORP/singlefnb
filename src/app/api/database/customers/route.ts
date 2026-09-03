import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withAuth, withRole, apiError, catatAudit } from "@/lib/api-helpers";

// Customer = pembeli POS. Tulis: OWNER + SALES. FINANCE/PRODUKSI hanya lihat.
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

// GET /api/database/customers?search= — semua role login bisa lihat
export const GET = withAuth(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const items = await getPrisma().customer.findMany({ take: 200, where: search ? { nama: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ items: items.map(serialize) });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/database/customers — OWNER + SALES
export const POST = withRole([...WRITE_ROLES], async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

    const dup = await getPrisma().customer.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" } },
    });
    if (dup) {
      return NextResponse.json({ error: "Nama customer sudah dipakai" }, { status: 400 });
    }

    const item = await getPrisma().customer.create({
      data: {
        nama,
        kontak: body.kontak ? String(body.kontak).trim() : null,
        alamat: body.alamat ? String(body.alamat).trim() : null,
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Customer",
      entitasId: item.id,
      detail: { nama: item.nama },
    });

    return NextResponse.json({ item: serialize(item) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
