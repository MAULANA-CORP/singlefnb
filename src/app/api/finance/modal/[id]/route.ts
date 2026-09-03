import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, catatAudit, apiError } from "@/lib/api-helpers";

// DELETE /api/finance/modal/:id — hapus entri Modal (harus dikonfirmasi via ConfirmDialog di UI)
export const DELETE = withOwnerFinance<{ params: Promise<{ id: string }> }>(async (user, _req, ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await getPrisma().modal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data Modal tidak ditemukan", type: "not_found" }, { status: 404 });
    }

    await getPrisma().modal.delete({ where: { id } });

    await catatAudit({
      userId: user.id,
      aksi: "DELETE",
      entitas: "Modal",
      entitasId: id,
      detail: { tipe: existing.tipe, jumlah: Number(existing.jumlah) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
});

// PATCH /api/finance/modal/:id — edit entri Modal
export const PATCH = withOwnerFinance<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    
    const existing = await getPrisma().modal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data Modal tidak ditemukan", type: "not_found" }, { status: 404 });
    }

    const { tipe, sumberDana, jumlah, tanggal, keterangan } = body;
    
    const updated = await getPrisma().modal.update({
      where: { id },
      data: {
        ...(tipe && { tipe }),
        ...(sumberDana !== undefined && { sumberDana }),
        ...(jumlah !== undefined && { jumlah: Number(jumlah) }),
        ...(tanggal && { tanggal: new Date(tanggal) }),
        ...(keterangan !== undefined && { keterangan }),
      },
    });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Modal",
      entitasId: id,
      detail: { before: existing, after: updated },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return apiError(error);
  }
});
