import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwnerFinance, apiError } from "@/lib/api-helpers";

// GET /api/finance/outlets — daftar outlet aktif untuk filter di Finance Room /
// Pengeluaran / Report. Read-only, sengaja tidak bergantung ke endpoint modul lain.
export const GET = withOwnerFinance(async () => {
  try {
    const outlets = await getPrisma().outlet.findMany({ take: 200, where: { isActive: true },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json({ outlets });
  } catch (error) {
    return apiError(error);
  }
});
