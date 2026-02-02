"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { FormatKind } from "@/lib/analytics/semantic";
import { formatMoney } from "@/lib/money";

export interface KpiHeroProps {
  value: number;
  format: FormatKind;
  currency?: string;
  label?: string;
  prior?: number;
  className?: string;
}

export function KpiHero({
  value,
  format,
  currency = "KES",
  label,
  prior,
  className,
}: KpiHeroProps) {
  const formatted =
    format === "currency"
      ? formatMoney(value, currency)
      : format === "percent"
        ? `${value.toFixed(1)}%`
        : format === "days"
          ? `${value} days`
          : value.toLocaleString();

  const delta = prior != null ? value - prior : null;
  const pct = prior != null && prior !== 0 ? (delta! / prior) * 100 : null;

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
      <p className="text-2xl md:text-3xl font-semibold tabular-nums tracking-tight">
        {formatted}
      </p>
      {prior != null && (
        <p className="text-xs text-muted-foreground">
          Prior:{" "}
          {format === "currency"
            ? formatMoney(prior, currency)
            : format === "percent"
              ? `${prior.toFixed(1)}%`
              : format === "days"
                ? `${prior} days`
                : prior.toLocaleString()}
        </p>
      )}
      {delta != null && pct != null && (
        <span
          className={cn(
            "text-xs font-medium",
            delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {delta > 0 ? "+" : ""}
          {pct.toFixed(1)}% vs prior
        </span>
      )}
    </div>
  );
}
