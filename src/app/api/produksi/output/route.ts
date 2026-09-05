import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError, catatAudit } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { buatOutput, ProduksiValidationError } from "@/lib/produksi";

/** GET /api/produksi/output — daftar output produksi (filter: outletId, dari, sampai) */
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

    const list = await prisma.output.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        outlet: { select: { id: true, nama: true } },
        user: { select: { id: true, nama: true } },
        proses: {
          include: {
            proses: { select: { id: true, nomor: true, nama: true } },
          },
        },
        produkJadi: {
          include: {
            produkJadi: { select: { id: true, nama: true, satuan: true } },
          },
        },
        kemasan: { include: { kemasan: { select: { id: true, nama: true } } } },
        biayaLain: true,
      },
    });

    const data = list.map((o) => ({
      id: o.id,
      nomor: o.nomor,
      tanggal: o.tanggal,
      catatan: o.catatan,
      totalBiaya: Number(o.totalBiaya),
      outlet: o.outlet,
      user: o.user,
      jumlahProses: o.proses.length,
      proses: o.proses.map((op) => op.proses),
      produkJadi: o.produkJadi.map((op) => ({
        id: op.id,
        produkJadi: op.produkJadi,
        qty: Number(op.qty),
        hppAlokasi: Number(op.hppAlokasi),
      })),
      kemasan: o.kemasan.map((ok: any) => ({
        id: ok.id,
        kemasan: ok.kemasan,
        qtyPakai: Number(ok.qtyPakai),
        hargaSatuanSaatItu: Number(ok.hargaSatuanSaatItu),
      })),
      biayaLain: (o as any).biayaLain?.map((bl: any) => ({
        id: bl.id,
        kategori: bl.kategori,
        jumlah: Number(bl.jumlah),
        catatan: bl.catatan,
      })) || [],
      jumlahKemasan: o.kemasan.length,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
});

/** POST /api/produksi/output — buat output baru (hitung HPP, kurangi stok kemasan, tambah stok produk jadi) */
export const POST = withOwnerProduksi(async (user, req) => {
  try {
    const body = await req.json();

    const outletId = String(body.outletId ?? "").trim();
    if (!outletId) {
      return NextResponse.json({ error: "Outlet wajib dipilih." }, { status: 400 });
    }

    const prosesIds = Array.isArray(body.prosesIds) ? body.prosesIds.map(String) : [];
    const kemasanLines = Array.isArray(body.kemasan) ? body.kemasan : [];
    const outputLines = Array.isArray(body.produkJadi) ? body.produkJadi : Array.isArray(body.output) ? body.output : [];
    const biayaLainLines = Array.isArray(body.biayaLain) ? body.biayaLain : [];

    const result = await buatOutput({
      outletId,
      userId: user.id,
      catatan: typeof body.catatan === "string" ? body.catatan.trim() : undefined,
      prosesIds,
      kemasan: kemasanLines.map((l: Record<string, unknown>) => ({
        kemasanId: String(l.kemasanId ?? ""),
        qtyPakai: Number(l.qtyPakai),
        hargaSatuanSaatItu: Number(l.hargaSatuanSaatItu),
      })),
      biayaLain: biayaLainLines.map((l: Record<string, unknown>) => ({
        kategori: String(l.kategori ?? ""),
        jumlah: Number(l.jumlah),
        catatan: typeof l.catatan === "string" ? l.catatan : undefined,
      })),
      output: outputLines.map((l: Record<string, unknown>) => ({
        produkJadiId: String(l.produkJadiId ?? ""),
        qty: Number(l.qty),
      })),
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "Output",
      entitasId: result.id,
      detail: { nomor: result.nomor, totalBiaya: result.totalBiaya },
    });

    return NextResponse.json({ data: { id: result.id, nomor: result.nomor } }, { status: 201 });
  } catch (error) {
    if (error instanceof ProduksiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
});
