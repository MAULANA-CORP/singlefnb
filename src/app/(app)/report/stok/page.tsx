import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { LaporanStokClient } from "./laporan-stok-client";

export default async function LaporanStokPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/dashboard");

  return <LaporanStokClient />;
}
