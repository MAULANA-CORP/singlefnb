import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { PosListClient } from "../pos-list-client";

export default async function PosHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "PRODUKSI") redirect("/dashboard");

  const canCreate = user.role === "OWNER" || user.role === "SALES";

  return <PosListClient canCreate={canCreate} />;
}
