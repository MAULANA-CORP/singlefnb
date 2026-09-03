import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Semua role punya akses (lihat PRD §7 Role & Akses) — cakupan kategori diatur di dalam komponen client.
  if (!["OWNER", "FINANCE", "SALES", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  return <InventoryClient role={user.role} />;
}
