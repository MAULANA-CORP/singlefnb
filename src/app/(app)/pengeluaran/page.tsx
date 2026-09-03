import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { PengeluaranClient } from "./pengeluaran-client";

export default async function PengeluaranPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/dashboard");

  return <PengeluaranClient />;
}
