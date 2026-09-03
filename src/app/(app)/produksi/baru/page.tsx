import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { ProduksiFormClient } from "./produksi-form-client";

export default async function ProduksiBaruPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  return <ProduksiFormClient />;
}
