"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PiutangTab } from "./piutang-tab";
import { UtangTab } from "./utang-tab";
import type { OutletOption } from "./types";
import type { Role } from "@/lib/session";

export function UtangPiutangClient({ role, outlets }: { role: Role; outlets: OutletOption[] }) {
  const bisaLihatUtang = role === "OWNER" || role === "FINANCE";
  const bisaBayar = role === "OWNER" || role === "FINANCE";

  return (
    <div>
      <PageHeader
        title="Utang & Piutang"
        description="Kelola tagihan ke customer/agen (Piutang) dan kewajiban ke supplier/pemberi dana (Utang)."
      />

      <Tabs defaultValue="piutang">
        <TabsList>
          <TabsTrigger value="piutang">Piutang</TabsTrigger>
          {bisaLihatUtang && <TabsTrigger value="utang">Utang</TabsTrigger>}
        </TabsList>

        <TabsContent value="piutang">
          <PiutangTab outlets={outlets} canBayar={bisaBayar} />
        </TabsContent>

        {bisaLihatUtang && (
          <TabsContent value="utang">
            <UtangTab outlets={outlets} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
