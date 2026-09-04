import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderFormClient } from "./order-form-client";

export default async function BuatOrderB2BPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role !== "OWNER" && user.role !== "SALES") {
    return (
      <EmptyState
        title="Tidak ada akses"
        description="Hanya Owner dan Sales yang bisa membuat order B2B."
      />
    );
  }

  const prisma = getPrisma();
  const [agenList, outletList, produkList] = await Promise.all([
    prisma.agen.findMany({ orderBy: { nama: "asc" } }),
    prisma.outlet.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.produkJadi.findMany({ orderBy: { nama: "asc" } }),
  ]);

  return (
    <OrderFormClient
      defaultOutletId={user.outletId}
      agenList={agenList.map((a) => ({ id: a.id, nama: a.nama, kontak: a.kontak, noHP: a.noHP, alamat: a.alamat }))}
      outletList={outletList.map((o) => ({ id: o.id, nama: o.nama }))}
      produkList={produkList.map((p) => ({
        id: p.id,
        nama: p.nama,
        satuan: p.satuan,
        harga: Number(p.harga),
        stok: Number(p.stok),
      }))}
    />
  );
}
