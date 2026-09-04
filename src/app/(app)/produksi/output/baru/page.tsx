import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { OutputFormClient } from "./output-form-client";

export default async function OutputBaruPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "PRODUKSI"].includes(user.role)) redirect("/dashboard");

  return <OutputFormClient />;
}
