import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { PembelianClient } from "./_components/pembelian-client";

// Halaman Catat Pembelian / Utang Baru — OWNER & FINANCE saja (selaras dengan tab Utang).
// Data master (Supplier/BahanBaku/Kemasan/Outlet) diambil langsung lewat Prisma di server
// component supaya form tidak butuh loading state terpisah utk populate dropdown awal.
export default async function PembelianPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/keuangan/utang-piutang");

  const prisma = getPrisma();
  const [suppliers, bahanBaku, kemasan, outlets] = await Promise.all([
    prisma.supplier.findMany({
      select: { id: true, nama: true, kontak: true, alamat: true },
      orderBy: { nama: "asc" },
    }),
    prisma.bahanBaku.findMany({
      select: { id: true, nama: true, satuan: true },
      orderBy: { nama: "asc" },
    }),
    prisma.kemasan.findMany({
      select: { id: true, nama: true, satuan: true },
      orderBy: { nama: "asc" },
    }),
    prisma.outlet.findMany({
      where: { isActive: true },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  return (
    <PembelianClient suppliers={suppliers} bahanBaku={bahanBaku} kemasan={kemasan} outlets={outlets} />
  );
}
