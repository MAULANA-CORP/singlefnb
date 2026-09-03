import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { LaporanPenjualanClient } from "./laporan-penjualan-client";

export default async function LaporanPenjualanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/dashboard");

  return <LaporanPenjualanClient />;
}
