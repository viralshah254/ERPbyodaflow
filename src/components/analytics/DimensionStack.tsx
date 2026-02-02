"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { DIMENSIONS } from "@/lib/analytics";
import type { DimensionKey, MetricKey } from "@/lib/analytics/semantic";
import { getAllowedDimensions } from "@/lib/analytics/semantic";
import { cn } from "@/lib/utils";

const DIM_ORDER: DimensionKey[] = [
  "time", "product", "customer", "branch", "warehouse", "channel",
  "salesperson", "supplier", "price_list", "uom", "employee", "entity",
  "currency", "product_packaging", "project",
];

export interface DimensionStackProps {
  metric: MetricKey;
  selected: DimensionKey[];
  onToggle: (d: DimensionKey) => void;
  max?: number;
  className?: string;
}

export function DimensionStack({
  metric,
  selected,
  onToggle,
  max = 3,
  className,
}: DimensionStackProps) {
  const allowed = getAllowedDimensions(metric);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {DIM_ORDER.filter((d) => allowed.includes(d)).map((d) => {
        const dim = DIMENSIONS[d];
        const active = selected.includes(d);
        const disabled = !active && selected.length >= max;
        return (
          <button
            key={d}
            type="button"
            onClick={() => !disabled && onToggle(d)}
            disabled={disabled}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 hover:bg-muted border-transparent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {dim?.label ?? d.replace(/_/g, " ")}
          </button>
        );
      })}
    </div>
  );
}
