import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { buatBatchProduksi, ProduksiValidationError } from "@/lib/produksi";

/** GET /api/produksi — daftar batch produksi (filter: outletId, dari, sampai) */
export const GET = withOwnerProduksi(async (_user, req) => {
  try {
    const prisma = getPrisma();
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");

    const where: Record<string, unknown> = {};
    if (outletId) where.outletId = outletId;
    if (dari || sampai) {
      const rentang: Record<string, Date> = {};
      if (dari) rentang.gte = new Date(dari);
      if (sampai) rentang.lte = new Date(`${sampai}T23:59:59`);
      where.tanggal = rentang;
    }

    const batches = await prisma.produksiBatch.findMany({
      where,
      orderBy: { tanggal: "desc" },
      take: 200,
      include: {
        outlet: { select: { id: true, nama: true } },
        user: { select: { id: true, nama: true } },
        bahanBaku: { select: { id: true, qtyPakai: true, qtyWaste: true, hargaSatuanSaatItu: true } },
        kemasan: { select: { id: true, qtyPakai: true, hargaSatuanSaatItu: true } },
        output: {
          select: {
            id: true,
            qty: true,
            hppAlokasi: true,
            produkJadi: { select: { id: true, nama: true, satuan: true } },
          },
        },
      },
    });

    const data = batches.map((b) => ({
      id: b.id,
      nomor: b.nomor,
      tanggal: b.tanggal,
      catatan: b.catatan,
      totalBiaya: Number(b.totalBiaya),
      outlet: b.outlet,
      user: b.user,
      jumlahBahanBaku: b.bahanBaku.length,
      jumlahKemasan: b.kemasan.length,
      output: b.output.map((o) => ({
        id: o.id,
        produkJadi: o.produkJadi,
        qty: Number(o.qty),
        hppAlokasi: Number(o.hppAlokasi),
      })),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});

/** POST /api/produksi — buat batch produksi baru (transaksi penuh, lihat lib/produksi.ts) */
export const POST = withOwnerProduksi(async (user, req) => {
  try {
    const body = await req.json();

    const outletId = String(body.outletId ?? "").trim();
    if (!outletId) {
      return NextResponse.json({ error: "Outlet wajib dipilih." }, { status: 400 });
    }

    const bahanBakuLines = Array.isArray(body.bahanBaku) ? body.bahanBaku : [];
    const kemasanLines = Array.isArray(body.kemasan) ? body.kemasan : [];
    const outputLines = Array.isArray(body.output) ? body.output : [];

    const batch = await buatBatchProduksi({
      outletId,
      userId: user.id,
      catatan: typeof body.catatan === "string" ? body.catatan.trim() : undefined,
      bahanBaku: bahanBakuLines.map((l: Record<string, unknown>) => ({
        bahanBakuId: String(l.bahanBakuId ?? ""),
        qtyPakai: Number(l.qtyPakai),
        qtyWaste: l.qtyWaste != null && l.qtyWaste !== "" ? Number(l.qtyWaste) : 0,
        hargaSatuanSaatItu: Number(l.hargaSatuanSaatItu),
      })),
      kemasan: kemasanLines.map((l: Record<string, unknown>) => ({
        kemasanId: String(l.kemasanId ?? ""),
        qtyPakai: Number(l.qtyPakai),
        hargaSatuanSaatItu: Number(l.hargaSatuanSaatItu),
      })),
      output: outputLines.map((l: Record<string, unknown>) => ({
        produkJadiId: String(l.produkJadiId ?? ""),
        qty: Number(l.qty),
      })),
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "ProduksiBatch",
      entitasId: batch.id,
      detail: { nomor: batch.nomor, totalBiaya: batch.totalBiaya },
    });

    return NextResponse.json({ data: { id: batch.id, nomor: batch.nomor } }, { status: 201 });
  } catch (error) {
    if (error instanceof ProduksiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
});
