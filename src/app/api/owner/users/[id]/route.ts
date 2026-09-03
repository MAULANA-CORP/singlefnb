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

// PATCH /api/owner/users/:id — ubah nama/role/outlet/isActive, dan/atau reset password (opsional).
// Username SENGAJA tidak bisa diubah lewat endpoint ini (dipakai sebagai identitas login).
export const PATCH = withOwner<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const data: {
      nama?: string;
      role?: Role;
      outletId?: string | null;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (typeof body?.nama === "string") {
      const nama = body.nama.trim();
      if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
      data.nama = nama;
    }
    if (body?.role !== undefined) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
      }
      if (id === user.id && body.role !== user.role) {
        return NextResponse.json({ error: "Tidak bisa mengubah role akun sendiri (mencegah lockout)" }, { status: 400 });
      }
      data.role = body.role;
    }
    if ("outletId" in body) {
      data.outletId = typeof body.outletId === "string" && body.outletId ? body.outletId : null;
    }
    if (typeof body?.isActive === "boolean") {
      if (id === user.id && body.isActive === false) {
        return NextResponse.json({ error: "Tidak bisa menonaktifkan akun sendiri" }, { status: 400 });
      }
      data.isActive = body.isActive;
    }
    if (typeof body?.password === "string" && body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim" }, { status: 400 });
    }

    const updated = await getPrisma().user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    await catatAudit({
      userId: user.id,
      aksi: "UPDATE",
      entitas: "User",
      entitasId: updated.id,
      // Jangan pernah mencatat password/hash asli ke audit log — cukup penanda kalau direset.
      detail: {
        nama: data.nama,
        role: data.role,
        outletId: data.outletId,
        isActive: data.isActive,
        password: data.passwordHash ? "(direset)" : undefined,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return apiError(error);
  }
});
