import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";

function serializePengeluaran(p: {
  id: string;
  outletId: string | null;
  userId: string;
  kategori: string;
  jumlah: unknown;
  tanggal: Date;
  keterangan: string | null;
  createdAt: Date;
  outlet?: { nama: string } | null;
  user?: { nama: string } | null;
}) {
  return {
    id: p.id,
    outletId: p.outletId,
    namaOutlet: p.outlet?.nama ?? null,
    userId: p.userId,
    namaUser: p.user?.nama ?? "",
    kategori: p.kategori,
    jumlah: Number(p.jumlah),
    tanggal: p.tanggal,
    keterangan: p.keterangan,
    createdAt: p.createdAt,
  };
}

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/pengeluaran/:id — ubah entri Pengeluaran
export const PATCH = withOwnerFinance<Ctx>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await getPrisma().pengeluaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengeluaran tidak ditemukan", type: "not_found" }, { status: 404 });
    }

    const body = await req.json();
    const kategori = typeof body.kategori === "string" ? body.kategori.trim() : existing.kategori;
    const jumlah = body.jumlah !== undefined ? Number(body.jumlah) : Number(existing.jumlah);
    const tanggal = body.tanggal ? new Date(body.tanggal) : existing.tanggal;
    const outletId = body.outletId !== undefined ? body.outletId || null : existing.outletId;
    const keterangan =
      body.keterangan !== undefined ? (typeof body.keterangan === "string" ? body.keterangan.trim() || null : null) : existing.keterangan;

    if (!kategori) {
      return NextResponse.json({ error: "Kategori wajib diisi", type: "validation" }, { status: 400 });
    }
    if (!(jumlah > 0)) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0", type: "validation" }, { status: 400 });
    }
    if (Number.isNaN(tanggal.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid", type: "validation" }, { status: 400 });
    }

    const updated = await getPrisma().pengeluaran.update({
      where: { id },
      data: { kategori, jumlah, tanggal, outletId, keterangan },
      include: { outlet: { select: { nama: true } }, user: { select: { nama: true } } },
    });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Pengeluaran",
      entitasId: id,
      detail: { kategori, jumlah },
    });

    return NextResponse.json({ pengeluaran: serializePengeluaran(updated) });
  } catch (error) {
    return apiError(error);
  }
});

// DELETE /api/pengeluaran/:id — hapus entri Pengeluaran (harus dikonfirmasi via ConfirmDialog di UI)
export const DELETE = withOwnerFinance<Ctx>(async (user, _req, ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await getPrisma().pengeluaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengeluaran tidak ditemukan", type: "not_found" }, { status: 404 });
    }

    await getPrisma().pengeluaran.delete({ where: { id } });

    await catatAudit({
      userId: user.id,
      aksi: "DELETE",
      entitas: "Pengeluaran",
      entitasId: id,
      detail: { kategori: existing.kategori, jumlah: Number(existing.jumlah) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
});
