import { NextResponse } from "next/server";
import { withOwnerProduksi, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** GET /api/produksi/opsi — data dropdown untuk form produksi (outlet, bahan baku, kemasan, produk jadi, proses selesai) */
export const GET = withOwnerProduksi(async () => {
  try {
    const prisma = getPrisma();
    const [outlets, bahanBaku, kemasan, produkJadi, prosesSelesai] = await Promise.all([
      prisma.outlet.findMany({ take: 200, where: { isActive: true },
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      }),
      prisma.bahanBaku.findMany({ take: 200, orderBy: { nama: "asc" },
        select: { id: true, nama: true, satuan: true, stok: true, hargaRataRata: true },
      }),
      prisma.kemasan.findMany({ take: 200, orderBy: { nama: "asc" },
        select: { id: true, nama: true, satuan: true, stok: true },
      }),
      prisma.produkJadi.findMany({ take: 200, orderBy: { nama: "asc" },
        select: { id: true, nama: true, satuan: true, beratBersih: true, stok: true, kemasanId: true, qtyKemasanPerUnit: true },
      }),
      // Proses yang sudah SELESAI, bisa dipilih untuk Output
      prisma.proses.findMany({
        where: { status: "SELESAI" },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          nomor: true,
          nama: true,
          tanggal: true,
          outletId: true,
          outlet: { select: { id: true, nama: true } },
          bahanBaku: {
            select: { qtyPakai: true, qtyWaste: true, hargaSatuanSaatItu: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        outlets,
        bahanBaku: bahanBaku.map((b) => ({ ...b, stok: Number(b.stok), hargaRataRata: Number(b.hargaRataRata) })),
        kemasan: kemasan.map((k) => ({ ...k, stok: Number(k.stok) })),
        produkJadi: produkJadi.map((p) => ({ ...p, stok: Number(p.stok) })),
        prosesSelesai: prosesSelesai.map((p) => ({
          id: p.id,
          nomor: p.nomor,
          nama: p.nama,
          tanggal: p.tanggal,
          outletId: p.outletId,
          outlet: p.outlet,
          totalBiaya: p.bahanBaku.reduce(
            (sum, b) => sum + (Number(b.qtyPakai) + Number(b.qtyWaste)) * Number(b.hargaSatuanSaatItu),
            0
          ),
        })),
      },
    });
  } catch (error) {
    return apiError(error);
  }
});
