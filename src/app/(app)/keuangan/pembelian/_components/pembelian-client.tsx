"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PembelianForm } from "./pembelian-form";
import type { OutletOption, StokItemOption, SupplierOption } from "./types";

export function PembelianClient({
  suppliers,
  bahanBaku,
  kemasan,
  outlets,
}: {
  suppliers: SupplierOption[];
  bahanBaku: StokItemOption[];
  kemasan: StokItemOption[];
  outlets: OutletOption[];
}) {
  return (
    <div>
      <Link
        href="/keuangan/utang-piutang"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Utang & Piutang
      </Link>

      <PageHeader
        title="Catat Belanja Bahan Baku"
        description="Pembelian dari supplier — stok bertambah otomatis. Pilih CASH, CREDIT, atau SPLIT (bayar sebagian)."
      />

      <Card>
        <PembelianForm suppliers={suppliers} bahanBaku={bahanBaku} kemasan={kemasan} outlets={outlets} />
      </Card>
    </div>
  );
}
