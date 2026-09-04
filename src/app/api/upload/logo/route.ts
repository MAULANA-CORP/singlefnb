import { NextResponse } from "next/server";
import { withOwnerFinance } from "@/lib/api-helpers";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { getPrisma } from "@/lib/prisma";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** POST /api/upload/logo — upload logo toko */
export const POST = withOwnerFinance(async (user, req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung (png, jpg, webp, svg)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const filename = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const publicPath = `/uploads/${filename}`;

    // Hapus logo lama jika ada
    const prisma = getPrisma();
    const existing = await prisma.pengaturan.findUnique({ where: { id: "singleton" } });
    if (existing?.logoUrl && existing.logoUrl.startsWith("/uploads/")) {
      const oldFile = join(process.cwd(), "public", existing.logoUrl);
      await unlink(oldFile).catch(() => {}); // ignore jika file tidak ada
    }

    await prisma.pengaturan.update({
      where: { id: "singleton" },
      data: { logoUrl: publicPath },
    });

    return NextResponse.json({ data: { url: publicPath } });
  } catch (error) {
    console.error("[api/upload/logo]", error);
    return NextResponse.json({ error: "Gagal upload logo" }, { status: 500 });
  }
});
