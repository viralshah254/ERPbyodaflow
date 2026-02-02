"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyticsResult, AnalyticsRow } from "@/lib/analytics/types";
import { getMetric } from "@/lib/analytics/semantic";
import type { DimensionKey } from "@/lib/analytics/semantic";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ExplorerTableProps {
  result: AnalyticsResult;
  onDrill?: (row: AnalyticsRow) => void;
  maxRows?: number;
  className?: string;
}

function formatVal(
  v: number,
  format: "currency" | "number" | "percent" | "days",
  currency: string
) {
  return format === "currency"
    ? formatMoney(v, currency)
    : format === "percent"
      ? `${v.toFixed(1)}%`
      : format === "days"
        ? `${v} days`
        : v.toLocaleString();
}

export function ExplorerTable({
  result,
  onDrill,
  maxRows = 20,
  className,
}: ExplorerTableProps) {
  const def = getMetric(result.query.metric);
  const dims = result.query.dimensions.length
    ? (result.query.dimensions as DimensionKey[])
    : (["time"] as DimensionKey[]);
  const currency = result.query.filters?.currency ?? "KES";
  const rows = result.rows.slice(0, maxRows);

  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {dims.map((d) => (
              <TableHead key={d} className="font-medium">
                {d.replace(/_/g, " ")}
              </TableHead>
            ))}
            <TableHead className="text-right font-medium">Value</TableHead>
            {def.format !== "currency" ? null : (
              <TableHead className="text-right font-medium">Prior</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow
              key={i}
              className={onDrill ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onDrill?.(r)}
            >
              {dims.map((d) => (
                <TableCell key={d}>{r.dimensions[d] ?? "—"}</TableCell>
              ))}
              <TableCell className="text-right tabular-nums">
                {formatVal(r.value, def.format, currency)}
              </TableCell>
              {def.format !== "currency" ? null : (
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.prior != null ? formatMoney(r.prior, currency) : "—"}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
