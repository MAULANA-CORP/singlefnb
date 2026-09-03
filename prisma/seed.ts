// jalankan: npm run db:seed — idempoten, aman dijalankan berkali-kali.

import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const outlet = await prisma.outlet.upsert({
    where: { id: "outlet-utama" },
    update: {},
    create: { id: "outlet-utama", nama: "Outlet Utama" },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      nama: "Owner",
      username: "admin",
      passwordHash,
      role: "OWNER",
      outletId: outlet.id,
    },
  });

  await prisma.pengaturan.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", namaToko: "Gampangin FNB" },
  });

  console.log(`Admin siap: ${admin.username} (outlet: ${outlet.nama})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log("Password default: admin123 — ganti setelah login pertama.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
