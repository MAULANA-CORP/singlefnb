import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderFormClient } from "./baru/order-form-client";
import { OrderListClient } from "./_components/order-list-client";

export default async function B2BPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "PRODUKSI") redirect("/dashboard");

  const canCreate = user.role === "OWNER" || user.role === "SALES";

  const prisma = getPrisma();
  const [agenList, outletList, produkList] = await Promise.all([
    prisma.agen.findMany({ select: { id: true, nama: true, kontak: true, noHP: true, alamat: true }, orderBy: { nama: "asc" } }),
    prisma.outlet.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    prisma.produkJadi.findMany({ select: { id: true, nama: true, satuan: true, harga: true, stok: true }, orderBy: { nama: "asc" } }),
  ]);

  return (
    <Tabs defaultValue="transaksi">
      <TabsList>
        <TabsTrigger value="transaksi">Transaksi Baru</TabsTrigger>
        <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
      </TabsList>

      <TabsContent value="transaksi">
        {canCreate ? (
          <OrderFormClient
            defaultOutletId={outletList[0]?.id ?? null}
            agenList={agenList}
            outletList={outletList}
            produkList={produkList.map((p) => ({ ...p, harga: Number(p.harga), stok: Number(p.stok) }))}
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-400">
            Anda tidak memiliki akses untuk membuat transaksi B2B.
          </div>
        )}
      </TabsContent>

      <TabsContent value="riwayat">
        <OrderListClient role={user.role} />
      </TabsContent>
    </Tabs>
  );
}
