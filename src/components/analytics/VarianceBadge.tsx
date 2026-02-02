"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface VarianceBadgeProps {
  current: number;
  prior: number;
  /** e.g. "currency" — show absolute delta; "percent" — show % only */
  format?: "number" | "percent";
  invert?: boolean;
  className?: string;
}

export function VarianceBadge({
  current,
  prior,
  format = "number",
  invert = false,
  className,
}: VarianceBadgeProps) {
  const delta = current - prior;
  const pct = prior !== 0 ? (delta / prior) * 100 : 0;
  const positive = delta > 0;
  const good = invert ? !positive : positive;

  const label =
    format === "percent"
      ? `${delta >= 0 ? "+" : ""}${pct.toFixed(1)}%`
      : `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        good
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/10 text-red-700 dark:text-red-400",
        className
      )}
    >
      {label}
    </span>
  );
}
