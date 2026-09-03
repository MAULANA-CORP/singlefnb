// Pembungkus route handler. Middleware saja tidak cukup — API bisa dipanggil
// langsung tanpa lewat navigasi halaman, jadi setiap handler tetap dijaga.

import { NextResponse } from "next/server";
import { getSession, type Role } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export interface AuthUser {
  id: string;
  nama: string;
  role: Role;
  outletId: string | null;
}

/** Baca user + role SEGAR dari DB. Jangan pernah percaya role dari cookie. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;

  const user = await getPrisma().user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true, nama: true, role: true, outletId: true },
  });

  return (user as AuthUser) ?? null;
}

type Handler<T> = (user: AuthUser, req: Request, ctx: T) => Promise<Response> | Response;

export function withAuth<T>(handler: Handler<T>) {
  return async (req: Request, ctx: T) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Belum login", type: "auth_required" },
        { status: 401 }
      );
    }
    return handler(user, req, ctx);
  };
}

export function withRole<T>(roles: Role[], handler: Handler<T>) {
  return async (req: Request, ctx: T) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Belum login", type: "auth_required" },
        { status: 401 }
      );
    }
    if (!roles.includes(user.role)) {
      console.warn(`[auth] Akses ditolak: ${user.id} (role ${user.role})`);
      return NextResponse.json(
        { error: "Anda tidak punya akses untuk tindakan ini.", type: "forbidden" },
        { status: 403 }
      );
    }
    return handler(user, req, ctx);
  };
}

export const withOwner = <T>(h: Handler<T>) => withRole<T>(["OWNER"], h);
export const withOwnerFinance = <T>(h: Handler<T>) => withRole<T>(["OWNER", "FINANCE"], h);
export const withOwnerSales = <T>(h: Handler<T>) => withRole<T>(["OWNER", "SALES"], h);
export const withOwnerProduksi = <T>(h: Handler<T>) => withRole<T>(["OWNER", "PRODUKSI"], h);

/** Error terstruktur -> respons JSON yang konsisten */
export function apiError(error: unknown) {
  console.error("[api]", error);
  const pesan = error instanceof Error ? error.message : "Terjadi kesalahan di server";
  return NextResponse.json({ error: pesan, type: "server_error" }, { status: 500 });
}

/** Catat audit log — panggil dari route handler setelah aksi berhasil. */
export async function catatAudit(params: {
  userId: string;
  aksi: string;
  entitas: string;
  entitasId?: string;
  detail?: Record<string, unknown>;
}) {
  await getPrisma().auditLog.create({
    data: {
      userId: params.userId,
      aksi: params.aksi,
      entitas: params.entitas,
      entitasId: params.entitasId,
      detail: params.detail as import("@/generated/prisma/client").Prisma.InputJsonValue | undefined,
    },
  });
}
