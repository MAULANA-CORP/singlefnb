import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance } from "@/lib/api-helpers";
import { buatPembelian, UtangPiutangError } from "@/lib/utang-piutang";

// GET /api/pembelian — riwayat pembelian (ringan, dipakai untuk cek/nomor terakhir).
export const GET = withOwnerFinance(async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") ?? 20) || 20, 100);

    const pembelian = await getPrisma().pembelian.findMany({ take: 200, include: {
        supplier: { select: { nama: true } },
        outlet: { select: { nama: true } },
        items: true,
        utang: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const data = pembelian.map((p) => ({
      id: p.id,
      nomor: p.nomor,
      supplierNama: p.supplier.nama,
      outletNama: p.outlet?.nama ?? null,
      tanggal: p.tanggal,
      total: Number(p.total),
      jumlahItem: p.items.length,
      statusUtang: p.utang?.status ?? null,
      utangId: p.utang?.id ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[api/pembelian GET]", error);
    return NextResponse.json({ error: "Gagal memuat riwayat pembelian" }, { status: 500 });
  }
});

// POST /api/pembelian — catat Pembelian baru dari Supplier: buat Pembelian+Item,
// tambah stok BahanBaku/Kemasan (+ StokMovement IN/PEMBELIAN), buat Utang terkait.
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const { pembelian, utang } = await buatPembelian(user, {
      supplierId: body.supplierId,
      outletId: body.outletId || null,
      tanggal: body.tanggal ?? undefined,
      keterangan: body.keterangan ?? null,
      items: Array.isArray(body.items) ? body.items : [],
      jatuhTempo: body.jatuhTempo,
    });

    return NextResponse.json({
      data: {
        pembelianId: pembelian.id,
        nomor: pembelian.nomor,
        total: Number(pembelian.total),
        utangId: utang.id,
      },
    });
  } catch (error) {
    if (error instanceof UtangPiutangError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/pembelian POST]", error);
    return NextResponse.json({ error: "Gagal mencatat pembelian" }, { status: 500 });
  }
});
