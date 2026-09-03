import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Wallet, Landmark, ShoppingCart, AlertTriangle, Boxes, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/api-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function ReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "FINANCE"].includes(user.role)) redirect("/dashboard");

  const laporan = [
    {
      href: "/finance",
      icon: TrendingUp,
      title: "Laba Rugi",
      desc: "Penjualan, HPP, beban operasional, dan laba bersih per periode.",
    },
    {
      href: "/finance",
      icon: Wallet,
      title: "Arus Kas",
      desc: "Kas masuk dan keluar per periode, lengkap dengan tren harian.",
    },
    {
      href: "/finance",
      icon: Landmark,
      title: "Neraca",
      desc: "Aset, kewajiban, dan modal per tanggal tertentu.",
    },
    {
      href: "/report/penjualan",
      icon: ShoppingCart,
      title: "Laporan Penjualan",
      desc: "Gabungan transaksi POS dan B2B per periode & outlet.",
    },
    {
      href: "/report/piutang-jatuh-tempo",
      icon: AlertTriangle,
      title: "Piutang Jatuh Tempo",
      desc: "Semua piutang belum lunas, ditandai yang sudah lewat 30 hari.",
    },
    {
      href: "/report/stok",
      icon: Boxes,
      title: "Laporan Stok",
      desc: "Level stok & nilai stok saat ini untuk Bahan Baku, Kemasan, Produk Jadi.",
    },
  ];

  return (
    <div>
      <PageHeader title="Report" description="Semua laporan bisnis, siap export ke Excel." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {laporan.map((l) => (
          <Link key={l.title} href={l.href}>
            <Card className="h-full transition-colors hover:border-blue-400 dark:hover:border-blue-500">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
                  <l.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-50">{l.title}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
