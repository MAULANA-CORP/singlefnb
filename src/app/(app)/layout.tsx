import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pengaturan = await getPrisma().pengaturan.findUnique({ where: { id: "singleton" } });

  return (
    <AppLayout nama={user.nama} role={user.role} namaToko={pengaturan?.namaToko ?? "Gampangin FNB"}>
      {children}
    </AppLayout>
  );
}
