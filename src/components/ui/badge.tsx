import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "gray" | "green" | "amber" | "red" | "blue";

const toneClass: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-gray-200",
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300",
};

export function Badge({
  tone = "gray",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className
      )}
      {...props}
    />
  );
}

/** Badge status Lunas/Parsial/Belum Bayar — dipakai di Utang/Piutang/Order */
export function StatusBadge({ status }: { status: "LUNAS" | "PARSIAL" | "BELUM_BAYAR" }) {
  const map = {
    LUNAS: { tone: "green" as const, label: "Lunas" },
    PARSIAL: { tone: "amber" as const, label: "Parsial" },
    BELUM_BAYAR: { tone: "red" as const, label: "Belum Bayar" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
