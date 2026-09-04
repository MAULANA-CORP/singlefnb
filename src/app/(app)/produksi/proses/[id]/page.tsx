import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { ProsesDetailClient } from "./proses-detail-client";

export default async function ProsesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  const { id } = await params;
  return <ProsesDetailClient id={id} />;
}
