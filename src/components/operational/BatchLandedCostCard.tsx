"use client";

/**
 * BatchLandedCostCard — shows a cost waterfall for a fish batch from purchase
 * through processing to final delivery in-store.
 *
 * Layers (all in KES):
 *  1. Purchase value  (PO × FX rate)
 *  2. FX loss         (landed cost: currency_conversion)
 *  3. Permits / customs (landed cost: permits)
 *  4. Inbound logistics (landed cost: inbound_logistics)
 *  5. Gutting / processing fee (processing cost: processing_fee)
 *  6. Packaging materials    (processing cost: packaging)
 *  7. Outbound logistics     (processing cost: outbound_logistics)
 *  8. Transfer transport     (Transfer.transferCostKes linked via sourceGrnId)
 *  ─────────────────────────────────────────────────────────
 *  TOTAL LANDED COST (KES) | Per-kg cost
 */

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBatchCostSummary, type BatchCostSummary } from "@/lib/api/batch-cost-summary";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

interface LayerRow {
  label: string;
  amountKes: number;
  missing?: boolean;
  note?: string;
}

function fmt(n: number) {
  return formatMoney(n, "KES");
}

function pct(amount: number, total: number) {
  if (total <= 0) return "";
  return `${((amount / total) * 100).toFixed(1)}%`;
}

interface Props {
  /** GRN ID to build the cost summary for. */
  grnId: string;
  /** Optional GRN number for display. */
  grnNumber?: string;
  /** Optional link to the Inventory → Costing page to add missing cost allocations. */
  costingHref?: string;
}

export function BatchLandedCostCard({ grnId, grnNumber, costingHref }: Props) {
  const [summary, setSummary] = React.useState<BatchCostSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!grnId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchBatchCostSummary(grnId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setSummary(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [grnId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total Landed Cost</CardTitle>
          <CardDescription>Loading cost summary…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total Landed Cost</CardTitle>
          <CardDescription>No data — GRN not found or not yet costed.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = summary.totalLandedCostKes;
  const l = summary.layers;

  const layers: LayerRow[] = [
    {
      label: "Purchase value" + (summary.purchaseCurrency !== "KES" ? ` (${summary.purchaseCurrency} × ${summary.fxRate})` : ""),
      amountKes: l.purchaseValue,
    },
    ...(l.fxLoss > 0 ? [{ label: "Currency conversion loss", amountKes: l.fxLoss }] : []),
    ...(l.permits > 0 ? [{ label: "Permits / customs", amountKes: l.permits }] : []),
    ...(l.inboundLogistics > 0 ? [{ label: "Inbound logistics", amountKes: l.inboundLogistics }] : []),
    ...(l.otherLanded > 0 ? [{ label: "Other landed charges", amountKes: l.otherLanded }] : []),
    ...(l.processingFee > 0
      ? [{ label: `Gutting / processing fee${summary.processingType ? ` (${summary.processingType})` : ""}`, amountKes: l.processingFee }]
      : []),
    ...(l.packaging > 0 ? [{ label: "Packaging materials", amountKes: l.packaging }] : []),
    ...(l.outboundLogistics > 0 ? [{ label: "Outbound logistics (gutting → store)", amountKes: l.outboundLogistics }] : []),
    ...(l.transferCost > 0 ? [{ label: "Transfer transport cost", amountKes: l.transferCost }] : []),
  ];

  const missingLanded = !summary.hasLandedCostAllocation;
  const missingProcessing = !summary.hasProcessingCostAllocation;
  const hasGaps = missingLanded || missingProcessing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Total Landed Cost</CardTitle>
            <CardDescription>
              Full cost waterfall for batch
              {grnNumber ? ` ${grnNumber}` : grnId ? ` (GRN ${grnId.slice(-6)})` : ""}.
              {summary.receivedKg > 0 && ` ${summary.receivedKg.toLocaleString()} kg received.`}
            </CardDescription>
          </div>
          {costingHref && hasGaps && (
            <Link
              href={costingHref}
              className="text-xs font-medium text-primary hover:underline shrink-0"
            >
              <Icons.ExternalLink className="mr-1 inline h-3 w-3" />
              Add missing costs
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Cost rows */}
        <div className="divide-y text-sm">
          {layers.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-6 py-2.5">
              <span className="text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-medium">{fmt(row.amountKes)}</span>
                <span className="text-xs text-muted-foreground w-14 text-right">{pct(row.amountKes, total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-6 py-3">
          <span className="font-semibold text-sm">Total landed cost (KES)</span>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="text-base font-bold">{fmt(total)}</span>
            {summary.perKg != null && (
              <Badge variant="secondary" className="font-medium">
                {fmt(summary.perKg)} / kg
              </Badge>
            )}
          </div>
        </div>

        {/* Missing allocation warnings */}
        {hasGaps && (
          <div className="border-t px-6 py-3 space-y-1">
            {missingLanded && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Icons.AlertCircle className="h-3.5 w-3.5 shrink-0" />
                No landed cost allocation yet (FX, permits, inbound logistics missing).
                {costingHref && (
                  <Link href={costingHref} className="underline font-medium">
                    Add now
                  </Link>
                )}
              </p>
            )}
            {missingProcessing && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Icons.AlertCircle className="h-3.5 w-3.5 shrink-0" />
                No processing cost allocation yet (gutting fee, packaging missing).
                {costingHref && (
                  <Link href={costingHref} className="underline font-medium">
                    Add now
                  </Link>
                )}
              </p>
            )}
          </div>
        )}

        {/* Transfer details (if any) */}
        {summary.transferDetails.length > 0 && (
          <div className="border-t px-6 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Transfer leg costs</p>
            {summary.transferDetails.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-muted-foreground">{t.notes || t.number}</span>
                <span className="tabular-nums font-medium">{fmt(t.costKes)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
