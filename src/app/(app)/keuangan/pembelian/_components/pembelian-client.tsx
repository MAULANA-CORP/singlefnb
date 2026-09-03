"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PembelianForm } from "./pembelian-form";
import { UtangStandaloneForm } from "./utang-standalone-form";
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
        title="Catat Pembelian / Utang Baru"
        description="Pembelian dari supplier otomatis menambah stok dan mencatat utang. Pinjaman/Investor dicatat langsung tanpa item."
      />

      <Card>
        <Tabs defaultValue="pembelian">
          <TabsList>
            <TabsTrigger value="pembelian">Pembelian dari Supplier</TabsTrigger>
            <TabsTrigger value="standalone">Pinjaman / Investor</TabsTrigger>
          </TabsList>

          <TabsContent value="pembelian">
            <PembelianForm suppliers={suppliers} bahanBaku={bahanBaku} kemasan={kemasan} outlets={outlets} />
          </TabsContent>

          <TabsContent value="standalone">
            <UtangStandaloneForm />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
