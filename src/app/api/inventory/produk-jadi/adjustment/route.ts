import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** POST /api/inventory/produk-jadi/adjustment — koreksi stok manual (wajib alasan). OWNER & PRODUKSI saja. */
export const POST = withOwnerProduksi(async (user, req) => {
  try {
    const body = await req.json();
    const produkJadiId = String(body.itemId ?? "").trim();
    const tipe = body.tipe === "IN" || body.tipe === "OUT" ? body.tipe : null;
    const qty = Number(body.qty);
    const alasan = typeof body.alasan === "string" ? body.alasan.trim() : "";

    if (!produkJadiId) return NextResponse.json({ error: "Produk jadi wajib dipilih." }, { status: 400 });
    if (!tipe) return NextResponse.json({ error: "Tipe penyesuaian wajib IN atau OUT." }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Qty penyesuaian harus lebih dari 0." }, { status: 400 });
    }
    if (!alasan) return NextResponse.json({ error: "Alasan penyesuaian wajib diisi." }, { status: 400 });

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.produkJadi.findUnique({ where: { id: produkJadiId } });
      if (!item) throw new Error("Produk jadi tidak ditemukan.");

      if (tipe === "OUT" && Number(item.stok) < qty) {
        throw new Error(
          `Stok ${item.nama} tidak cukup untuk pengurangan (tersedia ${Number(item.stok)} ${item.satuan}).`
        );
      }

      const updated = await tx.produkJadi.update({
        where: { id: produkJadiId },
        data: { stok: tipe === "IN" ? { increment: qty } : { decrement: qty } },
      });

      await tx.stokMovementProdukJadi.create({
        data: {
          produkJadiId,
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
      entitas: "ProdukJadi",
      entitasId: produkJadiId,
      detail: { tipe, qty, alasan },
    });

    return NextResponse.json({ data: { stok: Number(result.stok) } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error);
  }
});
