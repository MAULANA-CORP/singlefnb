"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PengaturanTab } from "./_components/pengaturan-tab";
import { UserManagementTab } from "./_components/user-management-tab";
import { AuditLogTab } from "./_components/audit-log-tab";
import { ResetDataTab } from "./_components/reset-data-tab";

// Owner Room — khusus role OWNER (dijaga di layout via redirect kalau belum login;
// akses per-role sebenarnya di-enforce di tiap route API lewat withOwner).
export default function OwnerRoomPage() {
  const [tab, setTab] = React.useState("pengaturan");

  return (
    <div>
      <PageHeader
        title="Owner Room"
        description="Pengaturan toko, kelola user staff, audit log, dan reset data — khusus Owner."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pengaturan">Pengaturan Toko</TabsTrigger>
          <TabsTrigger value="user">User Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="reset">Reset & Fill Data</TabsTrigger>
        </TabsList>

        <TabsContent value="pengaturan">
          <PengaturanTab />
        </TabsContent>
        <TabsContent value="user">
          <UserManagementTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
        <TabsContent value="reset">
          <ResetDataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
