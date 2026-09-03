"use client";

// Bar filter periode (start/end) + outlet, dipakai bareng oleh tab Laba Rugi & Arus Kas.
import * as React from "react";
import { Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { OutletOption } from "./_lib";

export function PeriodOutletFilter({
  start,
  end,
  onStartChange,
  onEndChange,
  outletId,
  onOutletChange,
  outlets,
}: {
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  outletId: string | null;
  onOutletChange: (v: string | null) => void;
  outlets: OutletOption[];
}) {
  const outletOptions = [{ value: "", label: "Semua Outlet" }, ...outlets.map((o) => ({ value: o.id, label: o.nama }))];

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Filter className="h-4 w-4" />
        Filter Periode
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Dari Tanggal" type="date" value={start} onChange={(e) => onStartChange(e.target.value)} />
        <Input label="Sampai Tanggal" type="date" value={end} onChange={(e) => onEndChange(e.target.value)} />
        <SearchableSelect
          label="Outlet"
          placeholder="Semua Outlet"
          options={outletOptions}
          value={outletId}
          onChange={(v) => onOutletChange(v || null)}
        />
      </div>
    </Card>
  );
}

export function AsOfOutletFilter({
  asOf,
  onAsOfChange,
  outletId,
  onOutletChange,
  outlets,
}: {
  asOf: string;
  onAsOfChange: (v: string) => void;
  outletId: string | null;
  onOutletChange: (v: string | null) => void;
  outlets: OutletOption[];
}) {
  const outletOptions = [{ value: "", label: "Semua Outlet" }, ...outlets.map((o) => ({ value: o.id, label: o.nama }))];

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Filter className="h-4 w-4" />
        Per Tanggal
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Per Tanggal" type="date" value={asOf} onChange={(e) => onAsOfChange(e.target.value)} />
        <SearchableSelect
          label="Outlet"
          placeholder="Semua Outlet"
          options={outletOptions}
          value={outletId}
          onChange={(v) => onOutletChange(v || null)}
        />
      </div>
    </Card>
  );
}

/** Tombol tanda "Export tercatat di Audit Log" — dipakai konsisten di tiap tab laporan. */
export const EXPORT_HINT = "Export akan tercatat di Audit Log.";
