import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { OrderDetailClient } from "./order-detail-client";

export default async function PosDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "PRODUKSI") redirect("/dashboard");

  const { id } = await params;
  return <OrderDetailClient id={id} />;
}
