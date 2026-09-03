import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  tone?: "default" | "danger" | "success" | "warning";
  hint?: string;
}) {
  const toneClass = {
    default: "text-gray-900 dark:text-gray-50",
    danger: "text-red-600 dark:text-red-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <Card className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <p className={cn("mt-1 truncate text-2xl font-semibold", toneClass)}>{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{hint}</p>}
      </div>
      {Icon && (
        <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-700">
          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </Card>
  );
}
