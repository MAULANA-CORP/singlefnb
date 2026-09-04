import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/produksi/proses/:id — detail proses + breakdown bahan baku */
export const GET = withOwnerProduksi(async (_user, _req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const prisma = getPrisma();

    const proses = await prisma.proses.findUnique({
      where: { id },
      include: {
        outlet: { select: { id: true, nama: true } },
        user: { select: { id: true, nama: true } },
        bahanBaku: {
          include: { bahanBaku: { select: { id: true, nama: true, satuan: true } } },
        },
        outputs: {
          include: {
            output: { select: { id: true, nomor: true } },
          },
        },
      },
    });

    if (!proses) {
      return NextResponse.json({ error: "Proses tidak ditemukan." }, { status: 404 });
    }

    const totalBiaya = proses.bahanBaku.reduce(
      (sum, b) => sum + (Number(b.qtyPakai) + Number(b.qtyWaste)) * Number(b.hargaSatuanSaatItu),
      0
    );

    const data = {
      id: proses.id,
      nomor: proses.nomor,
      nama: proses.nama,
      tanggal: proses.tanggal,
      status: proses.status,
      catatan: proses.catatan,
      totalBiaya,
      outlet: proses.outlet,
      user: proses.user,
      bahanBaku: proses.bahanBaku.map((b) => ({
        id: b.id,
        bahanBaku: b.bahanBaku,
        qtyPakai: Number(b.qtyPakai),
        qtyWaste: Number(b.qtyWaste),
        hargaSatuanSaatItu: Number(b.hargaSatuanSaatItu),
        subtotal: (Number(b.qtyPakai) + Number(b.qtyWaste)) * Number(b.hargaSatuanSaatItu),
      })),
      outputs: proses.outputs.map((op) => ({
        id: op.output.id,
        nomor: op.output.nomor,
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});

/** PATCH /api/produksi/proses/:id — update status (DRAFT → SELESAI / DIBATALKAN) */
export const PATCH = withOwnerProduksi(async (user, req, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const newStatus = String(body.status ?? "").toUpperCase();

    if (!["SELESAI", "DIBATALKAN"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Status tidak valid. Hanya SELESAI atau DIBATALKAN yang diizinkan." },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const proses = await prisma.proses.findUnique({ where: { id } });

    if (!proses) {
      return NextResponse.json({ error: "Proses tidak ditemukan." }, { status: 404 });
    }

    if (proses.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Proses sudah berstatus ${proses.status}, tidak bisa diubah lagi.` },
        { status: 400 }
      );
    }

    const updated = await prisma.proses.update({
      where: { id },
      data: { status: newStatus as "SELESAI" | "DIBATALKAN" },
    });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "Proses",
      entitasId: id,
      detail: { statusLama: proses.status, statusBaru: newStatus },
    });

    return NextResponse.json({ data: { id: updated.id, status: updated.status } });
  } catch (error) {
    return apiError(error);
  }
});
