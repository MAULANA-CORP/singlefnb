import type { Role } from "@/lib/session";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof import("lucide-react");
  roles: Role[]; // role yang boleh LIHAT menu ini (akses tulis diatur lagi di dalam halaman/API)
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["OWNER", "FINANCE", "SALES", "PRODUKSI"] },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { href: "/pos", label: "POS", icon: "ShoppingCart", roles: ["OWNER", "SALES", "FINANCE"] },
      { href: "/b2b", label: "B2B", icon: "Briefcase", roles: ["OWNER", "SALES", "FINANCE"] },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { href: "/keuangan/utang-piutang", label: "Utang & Piutang", icon: "Wallet", roles: ["OWNER", "FINANCE", "SALES"] },
      { href: "/finance", label: "Finance Room", icon: "Landmark", roles: ["OWNER", "FINANCE"] },
      { href: "/pengeluaran", label: "Pengeluaran", icon: "Receipt", roles: ["OWNER", "FINANCE"] },
      { href: "/report", label: "Report", icon: "FileBarChart", roles: ["OWNER", "FINANCE"] },
    ],
  },
  {
    label: "Operasional",
    items: [
      { href: "/database", label: "Database", icon: "Database", roles: ["OWNER", "FINANCE", "SALES", "PRODUKSI"] },
      { href: "/produksi", label: "Proses Produksi", icon: "Factory", roles: ["OWNER", "PRODUKSI"] },
      { href: "/inventory", label: "Inventory", icon: "Boxes", roles: ["OWNER", "FINANCE", "SALES", "PRODUKSI"] },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/panduan", label: "Panduan", icon: "BookOpen", roles: ["OWNER", "FINANCE", "SALES", "PRODUKSI"] },
      { href: "/owner-room", label: "Owner Room", icon: "Settings", roles: ["OWNER"] },
    ],
  },
];
