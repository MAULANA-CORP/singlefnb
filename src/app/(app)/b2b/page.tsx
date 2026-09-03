import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderListClient } from "./_components/order-list-client";

export default async function B2BPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!["OWNER", "SALES", "FINANCE"].includes(user.role)) {
    return (
      <EmptyState
        title="Tidak ada akses"
        description="Modul B2B hanya bisa diakses oleh Owner, Sales, dan Finance (lihat-saja)."
      />
    );
  }

  return <OrderListClient role={user.role} />;
}
