import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { buatProses, ProduksiValidationError } from "@/lib/produksi";

/** GET /api/produksi/proses — daftar proses produksi (filter: outletId, status, dari, sampai) */
export const GET = withOwnerProduksi(async (_user, req) => {
  try {
    const prisma = getPrisma();
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const status = searchParams.get("status");
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");

    const where: Record<string, unknown> = {};
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (dari || sampai) {
      const rentang: Record<string, Date> = {};
      if (dari) rentang.gte = new Date(dari);
      if (sampai) rentang.lte = new Date(`${sampai}T23:59:59`);
      where.tanggal = rentang;
    }

    const list = await prisma.proses.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        outlet: { select: { id: true, nama: true } },
        user: { select: { id: true, nama: true } },
        bahanBaku: { select: { id: true, qtyPakai: true, qtyWaste: true, hargaSatuanSaatItu: true } },
      },
    });

    const data = list.map((p) => {
      const totalBiaya = p.bahanBaku.reduce(
        (sum, b) => sum + (Number(b.qtyPakai) + Number(b.qtyWaste)) * Number(b.hargaSatuanSaatItu),
        0
      );
      return {
        id: p.id,
        nomor: p.nomor,
        nama: p.nama,
        tanggal: p.tanggal,
        status: p.status,
        catatan: p.catatan,
        totalBiaya,
        outlet: p.outlet,
        user: p.user,
        jumlahBahanBaku: p.bahanBaku.length,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});

/** POST /api/produksi/proses — buat proses baru (kurangi stok bahan baku) */
export const POST = withOwnerProduksi(async (user, req) => {
  try {
    const body = await req.json();

    const outletId = String(body.outletId ?? "").trim();
    if (!outletId) {
      return NextResponse.json({ error: "Outlet wajib dipilih." }, { status: 400 });
    }

    const bahanBakuLines = Array.isArray(body.bahanBaku) ? body.bahanBaku : [];

    const proses = await buatProses({
      outletId,
      userId: user.id,
      nama: typeof body.nama === "string" ? body.nama.trim() : undefined,
      catatan: typeof body.catatan === "string" ? body.catatan.trim() : undefined,
      bahanBaku: bahanBakuLines.map((l: Record<string, unknown>) => ({
        bahanBakuId: String(l.bahanBakuId ?? ""),
        qtyPakai: Number(l.qtyPakai),
        qtyWaste: l.qtyWaste != null && l.qtyWaste !== "" ? Number(l.qtyWaste) : 0,
        hargaSatuanSaatItu: Number(l.hargaSatuanSaatItu),
      })),
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Proses",
      entitasId: proses.id,
      detail: { nomor: proses.nomor, totalBiaya: proses.totalBiaya },
    });

    return NextResponse.json({ data: { id: proses.id, nomor: proses.nomor } }, { status: 201 });
  } catch (error) {
    if (error instanceof ProduksiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
});
