import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  return NextResponse.json({ user });
}
