import { Badge } from "@/components/ui/badge";

export type StatusOrderB2B = "DRAFT" | "INVOICE" | "DIKIRIM" | "PARSIAL" | "LUNAS" | "BATAL";

const MAP: Record<StatusOrderB2B, { tone: "gray" | "green" | "amber" | "red" | "blue"; label: string }> = {
  DRAFT: { tone: "gray", label: "Draft" },
  INVOICE: { tone: "blue", label: "Invoice Diterbitkan" },
  DIKIRIM: { tone: "blue", label: "Dikirim" },
  PARSIAL: { tone: "amber", label: "Parsial" },
  LUNAS: { tone: "green", label: "Lunas" },
  BATAL: { tone: "red", label: "Batal" },
};

export function OrderStatusBadge({ status }: { status: StatusOrderB2B }) {
  const info = MAP[status] ?? MAP.DRAFT;
  return <Badge tone={info.tone}>{info.label}</Badge>;
}

export const STATUS_FILTERS: { value: StatusOrderB2B | "SEMUA"; label: string }[] = [
  { value: "SEMUA", label: "Semua" },
  { value: "DRAFT", label: "Draft" },
  { value: "INVOICE", label: "Invoice" },
  { value: "DIKIRIM", label: "Dikirim" },
  { value: "PARSIAL", label: "Parsial" },
  { value: "LUNAS", label: "Lunas" },
  { value: "BATAL", label: "Batal" },
];
