import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { ProsesFormClient } from "./proses-form-client";

export default async function ProsesBaruPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  return <ProsesFormClient />;
}
