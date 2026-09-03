import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/dashboard");

  return <FinanceClient />;
}
