import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { OutputDetailClient } from "./output-detail-client";

export default async function OutputDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  const { id } = await params;
  return <OutputDetailClient id={id} />;
}
