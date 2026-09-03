import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { OrderPOSForm } from "./order-form";

export default async function PosBaruPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Hanya OWNER & SALES yang boleh membuat order (lihat PRD §7 Role & Akses).
  if (user.role !== "OWNER" && user.role !== "SALES") redirect("/pos");

  return <OrderPOSForm />;
}
