"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Mini sparkline-style strip of values. No axes; color for meaning. */
export interface TrendStripProps {
  values: number[];
  /** Bar (default) or line */
  variant?: "bar" | "line";
  positiveIsGood?: boolean;
  className?: string;
}

export function TrendStrip({
  values,
  variant = "bar",
  positiveIsGood = true,
  className,
}: TrendStripProps) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  return (
    <div
      className={cn("flex items-end gap-0.5 h-8", className)}
      role="img"
      aria-label={`Trend: ${values.join(", ")}`}
    >
      {values.map((v, i) => {
        const pct = max - min ? ((v - min) / (max - min)) * 100 : 50;
        const height = Math.max(4, (pct / 100) * 32);
        const isLast = i === values.length - 1;
        const isUp = i > 0 && v > values[i - 1]!;
        const color =
          variant === "line"
            ? isLast
              ? "bg-primary"
              : "bg-muted-foreground/40"
            : positiveIsGood && isUp
              ? "bg-emerald-500/70"
              : !positiveIsGood && isUp
                ? "bg-red-500/70"
                : "bg-muted-foreground/30";

        return (
          <div
            key={i}
            className={cn(
              "rounded-sm transition-all",
              variant === "bar" ? "w-1.5 min-w-[6px]" : "w-0.5 min-w-[2px]",
              color
            )}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
