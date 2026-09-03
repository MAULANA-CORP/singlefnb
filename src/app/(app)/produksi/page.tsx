import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { ProduksiListClient } from "./produksi-list-client";

export default async function ProduksiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  return <ProduksiListClient />;
}
