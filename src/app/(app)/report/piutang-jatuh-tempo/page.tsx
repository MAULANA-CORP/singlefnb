import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { LaporanPiutangClient } from "./laporan-piutang-client";

export default async function LaporanPiutangJatuhTempoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/dashboard");

  return <LaporanPiutangClient />;
}
