"use client";

import * as React from "react";
import { TrendStrip } from "./TrendStrip";
import { cn } from "@/lib/utils";

export interface DeltaSparklineProps {
  values: number[];
  current: number;
  prior?: number;
  label?: string;
  format?: (n: number) => string;
  className?: string;
}

export function DeltaSparkline({
  values,
  current,
  prior,
  label,
  format = (n) => n.toLocaleString(),
  className,
}: DeltaSparklineProps) {
  const delta = prior != null ? current - prior : null;
  const pct = prior != null && prior !== 0 ? (delta! / prior) * 100 : null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium tabular-nums">{format(current)}</span>
        {delta != null && pct != null && (
          <span
            className={cn(
              "text-xs tabular-nums",
              delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {delta >= 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <TrendStrip values={values} variant="line" />
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}
