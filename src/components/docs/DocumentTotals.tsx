"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TotalRow {
  label: string;
  value: number | string;
}

interface DocumentTotalsProps {
  rows: TotalRow[];
  className?: string;
}

/** Subtotal / tax / total block for document view. */
export function DocumentTotals({ rows, className }: DocumentTotalsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-medium">
            {typeof r.value === "number" ? `KES ${r.value.toLocaleString()}` : r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
