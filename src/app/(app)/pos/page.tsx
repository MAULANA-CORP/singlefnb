import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderPOSForm } from "./baru/order-form";
import { PosListClient } from "./pos-list-client";

export default async function PosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "PRODUKSI") redirect("/dashboard");

  const canCreate = user.role === "OWNER" || user.role === "SALES";

  return (
    <Tabs defaultValue="transaksi">
      <TabsList>
        <TabsTrigger value="transaksi">Transaksi Baru</TabsTrigger>
        <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
      </TabsList>

      <TabsContent value="transaksi">
        {canCreate ? (
          <OrderPOSForm />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-400">
            Anda tidak memiliki akses untuk membuat transaksi POS.
          </div>
        )}
      </TabsContent>

      <TabsContent value="riwayat">
        <PosListClient canCreate={canCreate} />
      </TabsContent>
    </Tabs>
  );
}
