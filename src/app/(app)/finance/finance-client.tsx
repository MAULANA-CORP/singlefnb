"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ModalPanel } from "./modal-panel";
import { ArusKasPanel } from "./arus-kas-panel";
import { LabaRugiPanel } from "./laba-rugi-panel";
import { NeracaPanel } from "./neraca-panel";
import type { OutletOption } from "./_lib";

export function FinanceClient() {
  const [tab, setTab] = React.useState("modal");
  const [outlets, setOutlets] = React.useState<OutletOption[]>([]);

  React.useEffect(() => {
    fetch("/api/finance/outlets")
      .then((r) => r.json())
      .then((d) => setOutlets(d.outlets ?? []))
      .catch(() => setOutlets([]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Finance Room"
        description="Modal, Arus Kas, Laba Rugi, dan Neraca — khusus Owner & Finance."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="modal">Modal</TabsTrigger>
          <TabsTrigger value="arus-kas">Arus Kas</TabsTrigger>
          <TabsTrigger value="laba-rugi">Laba Rugi</TabsTrigger>
          <TabsTrigger value="neraca">Neraca</TabsTrigger>
        </TabsList>

        <TabsContent value="modal">
          <ModalPanel />
        </TabsContent>
        <TabsContent value="arus-kas">
          <ArusKasPanel outlets={outlets} />
        </TabsContent>
        <TabsContent value="laba-rugi">
          <LabaRugiPanel outlets={outlets} />
        </TabsContent>
        <TabsContent value="neraca">
          <NeracaPanel outlets={outlets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
