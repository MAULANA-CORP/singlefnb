import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withAuth, withOwnerFinance, apiError, catatAudit } from "@/lib/api-helpers";

// GET /api/database/supplier?q=... — daftar Supplier, dipakai SearchableSelect di
// modul Pembelian. CRUD lengkap Supplier ada di modul Database; endpoint ini minimal
// (list + create) supaya form Pembelian tidak bergantung modul lain yang belum tentu ada.
// Diperluas oleh modul Database: GET dilebarkan ke withAuth (semua role login boleh
// lihat, sesuai PRD), plus alias param `search` & key respons `items` — POST TIDAK
// diubah, form Pembelian masih bergantung pada perilaku "dedupe-return-existing"-nya.
export const GET = withAuth(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? searchParams.get("search"))?.trim();

    const suppliers = await getPrisma().supplier.findMany({
      where: q ? { nama: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { nama: "asc" },
      take: 100,
    });

    return NextResponse.json({ data: suppliers, items: suppliers });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/database/supplier — create-new inline dari form Pembelian.
// Cek duplikat nama (case-insensitive) dulu sebelum membuat baru (lihat PRD Edge Cases).
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body.nama ?? "").trim();
    if (!nama) {
      return NextResponse.json({ error: "Nama supplier wajib diisi" }, { status: 400 });
    }

    const existing = await getPrisma().supplier.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ data: existing, duplikat: true });
    }

    const supplier = await getPrisma().supplier.create({
      data: {
        nama,
        kontak: body.kontak ? String(body.kontak).trim() || null : null,
        alamat: body.alamat ? String(body.alamat).trim() || null : null,
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Supplier",
      entitasId: supplier.id,
      detail: { nama },
    });

    return NextResponse.json({ data: supplier });
  } catch (error) {
    return apiError(error);
  }
});
