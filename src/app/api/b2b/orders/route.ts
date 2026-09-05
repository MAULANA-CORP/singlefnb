import { NextResponse } from "next/server";
import { withRole, withOwnerSales, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { buatOrderB2B, serializeOrder, B2BError } from "@/lib/b2b";
import type { Prisma } from "@/generated/prisma/client";

const STATUS_VALID = ["DRAFT", "INVOICE", "DIKIRIM", "PARSIAL", "LUNAS", "BATAL"];

/** List order B2B — filter status/agen/outlet/pencarian nomor. View: Owner/Sales/Finance. */
export const GET = withRole(["OWNER", "SALES", "FINANCE"], async (_user, req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const agenId = searchParams.get("agenId");
    const outletId = searchParams.get("outletId");
    const q = searchParams.get("q")?.trim();

    const where: Prisma.OrderB2BWhereInput = {};
    if (status && STATUS_VALID.includes(status)) where.status = status as Prisma.OrderB2BWhereInput["status"];
    if (agenId) where.agenId = agenId;
    if (outletId) where.outletId = outletId;
    if (q) {
      where.OR = [
        { nomor: { contains: q, mode: "insensitive" } },
        { agen: { nama: { contains: q, mode: "insensitive" } } },
      ];
    }

    const orders = await getPrisma().orderB2B.findMany({
      where,
      include: { agen: true, outlet: true, items: true, invoice: true, suratJalan: true, piutang: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json({ data: orders.map(serializeOrder) });
  } catch (error) {
    return apiError(error);
  }
});

/** Buat order B2B baru (status DRAFT) — validasi & kurangi stok saat itu juga. Owner/Sales. */
export const POST = withOwnerSales(async (user, req) => {
  try {
    const body = await req.json();

    const items = Array.isArray(body.items)
      ? body.items.map((it: { produkJadiId: string; qty: number; hargaSatuan?: number }) => ({
          produkJadiId: String(it.produkJadiId),
          qty: Number(it.qty),
          hargaSatuan: it.hargaSatuan !== undefined ? Number(it.hargaSatuan) : undefined,
        }))
      : [];

    const order = await buatOrderB2B(user, {
      agenId: body.agenId || null,
      agenBaru: body.agenBaru
        ? { nama: String(body.agenBaru.nama ?? ""), kontak: body.agenBaru.kontak, alamat: body.agenBaru.alamat }
        : null,
      outletId: String(body.outletId ?? ""),
      items,
      catatan: body.catatan,
      metodeBayar: body.metodeBayar,
      tanggalJatuhTempo: body.tanggalJatuhTempo,
      bayarSekarang: body.bayarSekarang,
    });

    return NextResponse.json({ data: serializeOrder(order) }, { status: 201 });
  } catch (error) {
    if (error instanceof B2BError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error);
  }
});
