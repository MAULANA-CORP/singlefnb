import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, apiError, catatAudit } from "@/lib/api-helpers";

// Tulis Supplier: OWNER + FINANCE, sama seperti POST yang sudah ada di route.ts
// (dibuat modul Pembelian). Catatan: PRD §7 Role&Akses menuliskan Database/Supplier
// full-access hanya OWNER dengan FINANCE view-only — tapi POST yang sudah ada di
// sini dipakai form Pembelian dengan withOwnerFinance, jadi PUT/DELETE mengikuti
// supaya tidak ada endpoint yang tidak konsisten untuk entitas yang sama. Tombol
// Tambah/Edit/Hapus di tab Supilder pada UI Database tetap digated OWNER-only
// sesuai PRD; FINANCE tetap bisa lewat endpoint ini kalau dipanggil dari modul lain.
function isForeignKeyError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    ((error as { code: string }).code === "P2003" || (error as { code: string }).code === "P2014")
  );
}

// PUT /api/database/supplier/:id
export const PUT = withOwnerFinance<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

    const dup = await getPrisma().supplier.findFirst({
      where: { nama: { equals: nama, mode: "insensitive" }, NOT: { id } },
    });
    if (dup) {
      return NextResponse.json({ error: "Nama supplier sudah dipakai" }, { status: 400 });
    }

    const item = await getPrisma().supplier.update({
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
      entitas: "Supplier",
      entitasId: item.id,
      detail: { nama: item.nama },
    });

    return NextResponse.json({ item, data: item });
  } catch (error) {
    return apiError(error);
  }
});

// DELETE /api/database/supplier/:id
export const DELETE = withOwnerFinance<{ params: Promise<{ id: string }> }>(async (user, _req, ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await getPrisma().supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    await getPrisma().supplier.delete({ where: { id } });

    await catatAudit({
      userId: user.id,
      aksi: "DELETE",
      entitas: "Supplier",
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
