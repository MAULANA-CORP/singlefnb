import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withRole, apiError } from "@/lib/api-helpers";

// GET /api/pos/outlets — daftar outlet aktif, dipakai SearchableSelect di form POS.
// Catatan: pengelolaan Outlet (CRUD) ada di Owner Room, ini hanya read-only untuk
// kebutuhan modul POS supaya tidak bergantung ke modul lain yang belum tentu ada.
export const GET = withRole(["OWNER", "SALES", "FINANCE"], async () => {
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
