"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface SelectCtx {
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  labels: Record<string, string>;
  registerLabel: (val: string, label: string) => void;
}

const SelectCtx = React.createContext<SelectCtx | null>(null);

function useSelectCtx() {
  const ctx = React.useContext(SelectCtx);
  if (!ctx) throw new Error("Select compound components must be used inside <Select>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

export interface SelectProps {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const labelsRef = React.useRef<Record<string, string>>({});
  const [, forceRender] = React.useState(0);

  const registerLabel = React.useCallback((val: string, label: string) => {
    if (labelsRef.current[val] !== label) {
      labelsRef.current[val] = label;
      forceRender((n) => n + 1);
    }
  }, []);

  return (
    <SelectCtx.Provider
      value={{ value, onValueChange, open, setOpen, labels: labelsRef.current, registerLabel }}
    >
      <div className="relative">{children}</div>
    </SelectCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectCtx();
    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm",
          "border-gray-300 bg-white text-gray-900",
          "dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-50",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          "dark:focus:ring-offset-zinc-900",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

/* ------------------------------------------------------------------ */
/*  Value                                                             */
/* ------------------------------------------------------------------ */

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, labels } = useSelectCtx();
  const label = labels[value];
  return (
    <span className={label ? "" : "text-gray-500 dark:text-gray-400"}>
      {label ?? placeholder}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Content (dropdown)                                                */
/* ------------------------------------------------------------------ */

export interface SelectContentProps {
  children: React.ReactNode;
}

export function SelectContent({ children }: SelectContentProps) {
  const { open, setOpen } = useSelectCtx();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg",
        "border-gray-200 bg-white",
        "dark:border-zinc-700 dark:bg-zinc-800"
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item                                                              */
/* ------------------------------------------------------------------ */

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export function SelectItem({ value: itemValue, children }: SelectItemProps) {
  const { value, onValueChange, setOpen, registerLabel } = useSelectCtx();
  const selected = value === itemValue;

  // Register label text so SelectValue can display it
  const text = typeof children === "string" ? children : itemValue;
  React.useEffect(() => {
    registerLabel(itemValue, text);
  }, [itemValue, text, registerLabel]);

  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => {
        onValueChange(itemValue);
        setOpen(false);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm",
        "hover:bg-gray-100 dark:hover:bg-zinc-700",
        selected && "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      )}
    >
      {children}
    </div>
  );
}
