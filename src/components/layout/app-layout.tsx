"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut, Store } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/lib/session";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  FINANCE: "Finance",
  SALES: "Sales",
  PRODUKSI: "Produksi",
};

export function AppLayout({
  nama,
  role,
  namaToko,
  logoUrl,
  children,
}: {
  nama: string;
  role: Role;
  namaToko: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Berhasil logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 dark:border-zinc-800 lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-zinc-800">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="rounded-lg bg-blue-600 p-1.5 dark:bg-blue-500">
              <Store className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{namaToko}</span>
        </div>
        <Sidebar role={role} />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
                ) : null}
                <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{namaToko}</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar role={role} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-background px-4 dark:border-zinc-800">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{nama}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{ROLE_LABEL[role]}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
