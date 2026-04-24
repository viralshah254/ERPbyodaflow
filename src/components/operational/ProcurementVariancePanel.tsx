"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProcurementVariancePanelProps {
  poWeightKg: number;
  paidWeightKg: number;
  receivedWeightKg: number;
  compact?: boolean;
}

export function ProcurementVariancePanel({
  poWeightKg,
  paidWeightKg,
  receivedWeightKg,
  compact = false,
}: ProcurementVariancePanelProps) {
  // Primary variance: received at facility vs paid at farm gate (transit shrinkage / grading)
  const varianceKg = receivedWeightKg - paidWeightKg;
  const variancePct = paidWeightKg > 0 ? (varianceKg / paidWeightKg) * 100 : 0;
  const status: "MATCHED" | "VARIANCE" | "PENDING" =
    paidWeightKg === 0 && receivedWeightKg === 0
      ? "PENDING"
      : Math.abs(varianceKg) < 0.01
      ? "MATCHED"
      : "VARIANCE";

  // Data-check: flag when paid weight diverges significantly from PO ordered quantity
  const poVsPaidDiff = Math.abs(paidWeightKg - poWeightKg);
  const poVsPaidThreshold = poWeightKg > 0 ? Math.max(0.01, poWeightKg * 0.05) : 0.01;
  const poPaidMismatch = poWeightKg > 0 && paidWeightKg > 0 && poVsPaidDiff > poVsPaidThreshold;

  return (
    <Card className={cn(compact && "shadow-sm")}>
      <CardHeader className={cn(compact && "space-y-0 p-4 pb-2")}>
        <CardTitle className={cn(compact && "text-base")}>Procurement Variance</CardTitle>
        {!compact && (
          <CardDescription>Three-way view: ordered vs paid vs received weight.</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-3", compact && "space-y-2 p-4 pt-0")}>
        <div className={cn("grid sm:grid-cols-3", compact ? "gap-2" : "gap-3")}>
          <div>
            <div className={cn("text-muted-foreground", compact ? "text-[10px] uppercase tracking-wide" : "text-xs")}>
              PO weight
            </div>
            <div className={cn("font-semibold", compact ? "text-sm tabular-nums" : "text-lg")}>
              {poWeightKg.toLocaleString()} kg
            </div>
          </div>
          <div>
            <div className={cn("text-muted-foreground", compact ? "text-[10px] uppercase tracking-wide" : "text-xs")}>
              Paid weight
            </div>
            <div className={cn("font-semibold", compact ? "text-sm tabular-nums" : "text-lg")}>
              {paidWeightKg.toLocaleString()} kg
            </div>
          </div>
          <div>
            <div className={cn("text-muted-foreground", compact ? "text-[10px] uppercase tracking-wide" : "text-xs")}>
              Received weight
            </div>
            <div className={cn("font-semibold", compact ? "text-sm tabular-nums" : "text-lg")}>
              {receivedWeightKg.toLocaleString()} kg
            </div>
          </div>
        </div>

        {/* Primary match result: received vs paid (facility vs farm gate) */}
        <div className={cn("flex flex-wrap items-center", compact ? "gap-2" : "gap-3")}>
          <Badge
            variant={status === "MATCHED" ? "default" : status === "PENDING" ? "secondary" : "destructive"}
            className={cn(compact && "text-[10px] px-1.5 py-0")}
          >
            {status}
          </Badge>
          <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            Received vs paid:{" "}
            <span className="font-medium text-foreground">
              {varianceKg >= 0 ? "+" : ""}
              {varianceKg.toFixed(2)} kg
            </span>{" "}
            {paidWeightKg > 0 && `(${variancePct.toFixed(2)}%)`}
          </span>
        </div>

        {/* Secondary: warn if paid weight looks wrong vs PO ordered qty */}
        {poPaidMismatch && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
            <span className="font-medium shrink-0">Data check:</span>
            <span>
              Paid weight ({paidWeightKg.toLocaleString()} kg) differs from PO ordered quantity (
              {poWeightKg.toLocaleString()} kg) by {poVsPaidDiff.toFixed(2)} kg. Verify the farm-gate entry is correct.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

