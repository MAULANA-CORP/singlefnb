import { NextResponse } from "next/server";
import { withOwnerFinance, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** POST /api/database/customers/quick — buat customer baru dari form POS */
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body.nama ?? "").trim();
    const noHP = String(body.noHP ?? "").trim() || null;

    if (!nama) {
      return NextResponse.json({ error: "Nama customer wajib diisi" }, { status: 400 });
    }

    const prisma = getPrisma();
    const customer = await prisma.customer.create({
      data: { nama, kontak: noHP },
    });

    return NextResponse.json({ data: { id: customer.id, nama: customer.nama, kontak: customer.kontak } });
  } catch (error) {
    return apiError(error);
  }
});
