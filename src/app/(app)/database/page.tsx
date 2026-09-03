import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { DatabaseClient } from "./database-client";

export default async function DatabasePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Semua role punya akses lihat (lihat PRD §7 Role & Akses); hak tulis per tab
  // diatur lewat `writeRoles` di entity-config.ts dan ditegakkan lagi di tiap route API.
  return <DatabaseClient role={user.role} />;
}
