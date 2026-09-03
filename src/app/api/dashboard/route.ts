import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api-helpers";
import { getDashboardData } from "@/lib/dashboard";

// GET /api/dashboard — ringkasan berbeda per role, lihat src/lib/dashboard.ts
export const GET = withAuth(async (user, req) => {
  try {
    const url = new URL(req.url);
    const outletId = url.searchParams.get("outletId") || undefined;
    const data = await getDashboardData(user, outletId);
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
});
