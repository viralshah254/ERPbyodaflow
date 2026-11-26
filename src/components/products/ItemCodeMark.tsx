import * as React from "react";
import { isNumericItemCode } from "@/lib/products/item-code";
import { cn } from "@/lib/utils";

/** Whole-number item code. Heavier than the product name, and a separate color, so clerks can pick by code. */
export function ItemCodeMark({ code, className }: { code: string; className?: string }) {
  const label = code.trim();
  if (!label) return null;
  if (!isNumericItemCode(label)) {
    return <span className={cn("truncate text-sm tabular-nums", className)}>{label}</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.75rem] shrink-0 items-center justify-center rounded-md bg-sky-700 px-1.5 py-1 text-sm font-bold tabular-nums leading-none tracking-tight text-white shadow-sm dark:bg-sky-400 dark:text-sky-950",
        className,
      )}
    >
      {label}
    </span>
  );
}
