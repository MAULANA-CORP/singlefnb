import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** POST /api/inventory/kemasan/adjustment — koreksi stok manual (wajib alasan). OWNER & PRODUKSI saja. */
export const POST = withOwnerProduksi(async (user, req) => {
  try {
    const body = await req.json();
    const kemasanId = String(body.itemId ?? "").trim();
    const tipe = body.tipe === "IN" || body.tipe === "OUT" ? body.tipe : null;
    const qty = Number(body.qty);
    const alasan = typeof body.alasan === "string" ? body.alasan.trim() : "";

    if (!kemasanId) return NextResponse.json({ error: "Kemasan wajib dipilih." }, { status: 400 });
    if (!tipe) return NextResponse.json({ error: "Tipe penyesuaian wajib IN atau OUT." }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Qty penyesuaian harus lebih dari 0." }, { status: 400 });
    }
    if (!alasan) return NextResponse.json({ error: "Alasan penyesuaian wajib diisi." }, { status: 400 });

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.kemasan.findUnique({ where: { id: kemasanId } });
      if (!item) throw new Error("Kemasan tidak ditemukan.");

      if (tipe === "OUT" && Number(item.stok) < qty) {
        throw new Error(
          `Stok kemasan ${item.nama} tidak cukup untuk pengurangan (tersedia ${Number(item.stok)} ${item.satuan}).`
        );
      }

      const updated = await tx.kemasan.update({
        where: { id: kemasanId },
        data: { stok: tipe === "IN" ? { increment: qty } : { decrement: qty } },
      });

      await tx.stokMovementKemasan.create({
        data: {
          kemasanId,
          tipe,
          qty,
          sumber: "ADJUSTMENT",
          keterangan: alasan,
        },
      });

      return updated;
    });

    await catatAudit({
      userId: user.id,
      aksi: "ADJUSTMENT",
      entitas: "Kemasan",
      entitasId: kemasanId,
      detail: { tipe, qty, alasan },
    });

    return NextResponse.json({ data: { stok: Number(result.stok) } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error);
  }
});
