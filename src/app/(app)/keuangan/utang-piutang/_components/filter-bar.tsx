"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { FilterState, OutletOption } from "./types";
import { FILTER_KOSONG } from "./types";

const STATUS_OPTIONS = [
  { value: "BELUM_BAYAR", label: "Belum Bayar" },
  { value: "PARSIAL", label: "Parsial" },
  { value: "LUNAS", label: "Lunas" },
];

export function FilterBar({
  filter,
  onChange,
  outlets,
  pihakLabel = "Pihak",
  pihakPlaceholder = "Cari nama...",
  extra,
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  outlets: OutletOption[];
  pihakLabel?: string;
  pihakPlaceholder?: string;
  extra?: React.ReactNode;
}) {
  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filter, [key]: value });
  }

  const outletOptions = outlets.map((o) => ({ value: o.id, label: o.nama }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        label={pihakLabel}
        placeholder={pihakPlaceholder}
        value={filter.pihak}
        onChange={(e) => set("pihak", e.target.value)}
      />

      <SearchableSelect
        label="Status"
        placeholder="Semua status"
        options={STATUS_OPTIONS}
        value={filter.status || null}
        onChange={(v) => set("status", v ?? "")}
      />

      <SearchableSelect
        label="Outlet"
        placeholder="Semua outlet"
        options={outletOptions}
        value={filter.outletId || null}
        onChange={(v) => set("outletId", v ?? "")}
      />

      {extra}

      <Input
        label="Jatuh Tempo Dari"
        type="date"
        value={filter.jatuhTempoDari}
        onChange={(e) => set("jatuhTempoDari", e.target.value)}
      />
      <Input
        label="Jatuh Tempo Sampai"
        type="date"
        value={filter.jatuhTempoSampai}
        onChange={(e) => set("jatuhTempoSampai", e.target.value)}
      />
      <Input
        label="Tanggal Dibuat Dari"
        type="date"
        value={filter.tanggalDari}
        onChange={(e) => set("tanggalDari", e.target.value)}
      />
      <Input
        label="Tanggal Dibuat Sampai"
        type="date"
        value={filter.tanggalSampai}
        onChange={(e) => set("tanggalSampai", e.target.value)}
      />

      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => onChange({ ...FILTER_KOSONG })}
        >
          <RotateCcw className="h-4 w-4" />
          Reset Filter
        </Button>
      </div>
    </div>
  );
}
