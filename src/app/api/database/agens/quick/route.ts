import { NextResponse } from "next/server";
import { withOwnerFinance, apiError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/** POST /api/database/agens/quick — buat agen baru dari form B2B */
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body.nama ?? "").trim();
    const noHP = String(body.noHP ?? "").trim() || null;
    const alamat = String(body.alamat ?? "").trim() || null;

    if (!nama) {
      return NextResponse.json({ error: "Nama agen wajib diisi" }, { status: 400 });
    }

    const prisma = getPrisma();
    const agen = await prisma.agen.create({
      data: { nama, noHP, alamat },
    });

    return NextResponse.json({ data: { id: agen.id, nama: agen.nama, noHP: agen.noHP, alamat: agen.alamat } });
  } catch (error) {
    return apiError(error);
  }
});
