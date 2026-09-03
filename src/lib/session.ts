import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type Role = "OWNER" | "FINANCE" | "SALES" | "PRODUKSI";

export interface SessionData {
  userId?: string;
  nama?: string;
  isLoggedIn?: boolean;
  // CATATAN: role SENGAJA tidak disimpan di sini.
  // Role selalu dibaca fresh dari DB (lihat api-helpers.ts) supaya pencabutan
  // hak berlaku seketika, bukan menunggu session kedaluwarsa.
}

const secret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
  throw new Error("SESSION_SECRET wajib diisi minimal 32 karakter di produksi");
}

export const sessionOptions: SessionOptions = {
  password: secret || "dev_only_password_at_least_32_characters_long",
  cookieName: process.env.SESSION_COOKIE_NAME || "gampangin_fnb_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
