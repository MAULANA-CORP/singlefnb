"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EntityTab } from "./_components/entity-tab";
import { ENTITY_UI } from "./_lib/entity-config";
import type { Role } from "@/lib/session";

export function DatabaseClient({ role }: { role: Role }) {
  const [tab, setTab] = React.useState<string>(ENTITY_UI[0].slug);

  return (
    <div>
      <PageHeader
        title="Database"
        description="Master data Bahan Baku, Produk Jadi, Kemasan, Customer, Agen, dan Supplier — isi manual atau import CSV."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {ENTITY_UI.map((e) => (
            <TabsTrigger key={e.slug} value={e.slug}>
              {e.tabLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {ENTITY_UI.map((e) => (
          <TabsContent key={e.slug} value={e.slug}>
            <EntityTab entity={e} role={role} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
