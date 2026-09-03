// Master data Agen (pembeli B2B/distributor).
// Dibuat minimal di sini oleh modul B2B karena belum ada endpoint Database untuk
// Agen — dipakai untuk cari/list Agen di form Order B2B dan buat Agen baru inline.
// Modul Database (tab Agen) memperluas file ini: GET dilebarkan ke withAuth (semua
// role login boleh lihat, sesuai PRD), plus alias param `search` & key respons
// `items` supaya konsisten dengan tab lain — POST TIDAK diubah, form Order B2B
// masih bergantung pada perilaku "dedupe-return-existing"-nya.
import { NextResponse } from "next/server";
import { withAuth, withRole, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

export const GET = withAuth(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? searchParams.get("search"))?.trim();

    const agenList = await getPrisma().agen.findMany({
      where: q ? { nama: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { nama: "asc" },
      take: 200,
    });

    return NextResponse.json({ data: agenList, items: agenList });
  } catch (error) {
    return apiError(error);
  }
});

export const POST = withRole(["OWNER", "SALES"], async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body.nama ?? "").trim();
    if (!nama) {
      return NextResponse.json({ error: "Nama agen wajib diisi" }, { status: 400 });
    }

    const existing = await getPrisma().agen.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ data: existing, existing: true });
    }

    const agen = await getPrisma().agen.create({
      data: {
        nama,
        kontak: body.kontak ? String(body.kontak).trim() : null,
        alamat: body.alamat ? String(body.alamat).trim() : null,
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "BUAT_AGEN",
      entitas: "Agen",
      entitasId: agen.id,
      detail: { nama: agen.nama },
    });

    return NextResponse.json({ data: agen, existing: false }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
