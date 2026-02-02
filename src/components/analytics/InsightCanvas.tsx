"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiHero } from "./KpiHero";
import { DeltaSparkline } from "./DeltaSparkline";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { getMetric } from "@/lib/analytics/semantic";
import type { FormatKind, VizKind } from "@/lib/analytics/semantic";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface InsightCanvasProps {
  result: AnalyticsResult;
  /** override viz; default from metric */
  viz?: VizKind;
  className?: string;
}

function formatVal(v: number, f: FormatKind, currency: string) {
  return f === "currency"
    ? formatMoney(v, currency)
    : f === "percent"
      ? `${v.toFixed(1)}%`
      : f === "days"
        ? `${v} days`
        : v.toLocaleString();
}

export function InsightCanvas({ result, viz, className }: InsightCanvasProps) {
  const def = getMetric(result.query.metric);
  const form = def.format;
  const currency = result.query.filters?.currency ?? "KES";
  const v = viz ?? def.defaultVisualization;

  if (v === "kpi") {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {def.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KpiHero
            value={result.total}
            format={form}
            currency={currency}
            prior={result.priorTotal}
          />
        </CardContent>
      </Card>
    );
  }

  const sparkValues = result.rows.slice(0, 12).map((r) => r.value);
  const current = result.total;
  const prior = result.priorTotal;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {def.label}
        </CardTitle>
        <span className="text-lg font-semibold tabular-nums">
          {formatVal(current, form, currency)}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {sparkValues.length > 0 && (
          <DeltaSparkline
            values={sparkValues}
            current={current}
            prior={prior}
            format={(n) => formatVal(n, form, currency)}
          />
        )}
        {sparkValues.length === 0 && prior != null && (
          <p className="text-xs text-muted-foreground">
            Prior: {formatVal(prior, form, currency)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
