import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { withOwner, catatAudit, apiError } from "@/lib/api-helpers";
import type { Role } from "@/lib/session";

const ROLES: Role[] = ["OWNER", "FINANCE", "SALES", "PRODUKSI"];

const USER_SELECT = {
  id: true,
  nama: true,
  username: true,
  role: true,
  outletId: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  outlet: { select: { id: true, nama: true } },
} as const;

// GET /api/owner/users — daftar semua user staff. TIDAK PERNAH menyertakan passwordHash.
export const GET = withOwner(async () => {
  try {
    const users = await getPrisma().user.findMany({ take: 200, select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return apiError(error);
  }
});

// POST /api/owner/users — buat akun staff baru (password di-hash bcrypt, cost 10).
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const role = body?.role;
    const outletId = typeof body?.outletId === "string" && body.outletId ? body.outletId : null;

    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!username) return NextResponse.json({ error: "Username wajib diisi" }, { status: 400 });
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    const existing = await getPrisma().user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username sudah dipakai" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await getPrisma().user.create({
      data: { nama, username, passwordHash, role, outletId },
      select: USER_SELECT,
    });

    await catatAudit({
      userId: user.id,
      aksi: "CREATE",
      entitas: "User",
      entitasId: created.id,
      detail: { nama, username, role, outletId },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
});
