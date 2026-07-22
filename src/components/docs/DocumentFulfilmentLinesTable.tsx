"use client";

import * as React from "react";
import { Package, PackageCheck, PackageX, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { deliveryLinePrimaryLabel } from "@/lib/documents/format-delivery-line";
import { resolveSalesUomQty, scaleQtyWithHeal } from "@/lib/documents/sales-uom-qty";
import type { DocumentDetailRecord } from "@/lib/types/documents";
import { cn } from "@/lib/utils";

type FulfilmentLine = DocumentDetailRecord["lines"][number];
type LineState = "SHIPPED" | "NOT_PACKED" | "PARTIALLY_PACKED" | "PENDING";

type ResolvedLine = {
  line: FulfilmentLine;
  ordered: number;
  shipped: number;
  backorder: number;
  remaining: number | null;
  pct: number;
  state: LineState;
  label: string;
};

const STATE_META: Record<
  LineState,
  {
    label: string;
    badge: string;
    row: string;
    border: string;
    barShipped: string;
    barBack: string;
    icon: React.ReactNode;
  }
> = {
  SHIPPED: {
    label: "Complete",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    row: "bg-emerald-50/30 dark:bg-emerald-950/10",
    border: "border-l-emerald-500",
    barShipped: "bg-emerald-500",
    barBack: "bg-emerald-200/60 dark:bg-emerald-900/40",
    icon: <PackageCheck className="h-3.5 w-3.5" />,
  },
  PARTIALLY_PACKED: {
    label: "Partial",
    badge: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800",
    row: "bg-amber-50/60 dark:bg-amber-950/20",
    border: "border-l-amber-500",
    barShipped: "bg-amber-500",
    barBack: "bg-amber-200/70 dark:bg-amber-900/50",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  NOT_PACKED: {
    label: "Not shipped",
    badge: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800",
    row: "bg-rose-50/60 dark:bg-rose-950/20",
    border: "border-l-rose-500",
    barShipped: "bg-rose-400",
    barBack: "bg-rose-200/80 dark:bg-rose-900/50",
    icon: <PackageX className="h-3.5 w-3.5" />,
  },
  PENDING: {
    label: "Pending",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700",
    row: "",
    border: "border-l-slate-300 dark:border-l-slate-600",
    barShipped: "bg-slate-400",
    barBack: "bg-slate-200 dark:bg-slate-800",
    icon: <Package className="h-3.5 w-3.5" />,
  },
};

function resolveLine(
  line: FulfilmentLine,
  docStatus?: string,
  docType?: "sales-order" | "delivery-note",
  sourceDocStatus?: string
): ResolvedLine {
  const rawPrimary = line.qty ?? 0;
  const healedPrimary = resolveSalesUomQty({
    qty: rawPrimary,
    uom: line.unit,
    unitPrice: line.unitPrice,
    amount: line.amount,
    tax: line.tax,
  });

  const rawOrdered = line.orderedQuantity ?? line.sourceQuantity ?? rawPrimary;
  const rawShipped =
    docType === "delivery-note"
      ? (line.shippedQuantity ?? rawPrimary)
      : (line.shippedQuantity ?? line.convertedQuantity ?? 0);

  const ordered = scaleQtyWithHeal(rawOrdered, healedPrimary, rawPrimary);
  const shipped = scaleQtyWithHeal(rawShipped, healedPrimary, rawPrimary);
  const backorder = Math.max(0, Math.round((ordered - shipped) * 100) / 100);
  const remaining =
    line.remainingQuantity != null
      ? scaleQtyWithHeal(line.remainingQuantity, healedPrimary, rawPrimary)
      : null;
  const pct = ordered > 1e-9 ? Math.min(100, Math.round((shipped / ordered) * 100)) : 0;

  let state: LineState = "PENDING";
  if (line.fulfilmentStatus === "NOT_PACKED" || (shipped <= 1e-9 && backorder > 1e-9)) {
    state = "NOT_PACKED";
  } else if (line.fulfilmentStatus === "PARTIALLY_PACKED" || (shipped > 1e-9 && backorder > 1e-9)) {
    state = "PARTIALLY_PACKED";
  } else if (shipped >= ordered - 1e-9 && ordered > 0) {
    state = "SHIPPED";
  } else if (
    (String(docStatus ?? "").toUpperCase() === "PARTIALLY_FULFILLED" ||
      String(sourceDocStatus ?? "").toUpperCase() === "PARTIALLY_FULFILLED") &&
    backorder > 1e-9
  ) {
    state = shipped > 1e-9 ? "PARTIALLY_PACKED" : "NOT_PACKED";
  }

  return {
    line,
    ordered,
    shipped,
    backorder,
    remaining,
    pct,
    state,
    label: deliveryLinePrimaryLabel({
      productName: line.productName,
      productSku: line.productSku,
      description: line.description,
    }),
  };
}

function stateLabel(state: LineState, docType: "sales-order" | "delivery-note"): string {
  if (docType === "delivery-note" && state === "NOT_PACKED") return "Not packed";
  if (docType === "delivery-note" && state === "SHIPPED") return "On truck";
  if (state === "NOT_PACKED") return "Not shipped";
  return STATE_META[state].label;
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function LineProgressBar({ pct, state }: { pct: number; state: LineState }) {
  const meta = STATE_META[state];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/80" title={`${pct}% shipped`}>
      {pct > 0 ? <div className={cn("h-full shrink-0", meta.barShipped)} style={{ width: `${pct}%` }} /> : null}
      {pct < 100 ? <div className={cn("h-full min-w-0 flex-1", meta.barBack)} /> : null}
    </div>
  );
}

const FULFIL_COLGROUP = (
  <colgroup>
    <col style={{ width: "20%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "5%" }} />
    <col style={{ width: "6%" }} />
    <col style={{ width: "6%" }} />
    <col style={{ width: "7%" }} />
    <col style={{ width: "12%" }} />
    <col style={{ width: "9%" }} />
    <col style={{ width: "10%" }} />
    <col style={{ width: "15%" }} />
  </colgroup>
);

const thClass =
  "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground align-middle whitespace-nowrap";
const tdClass = "px-3 py-3 align-middle";

export function DocumentFulfilmentLinesTable({
  lines,
  currency,
  exchangeRate,
  docType,
  docStatus,
  sourceDocStatus,
  showAlternateCurrency = true,
}: {
  lines: FulfilmentLine[];
  currency: string;
  exchangeRate?: number;
  docType: "sales-order" | "delivery-note";
  docStatus?: string;
  sourceDocStatus?: string;
  showAlternateCurrency?: boolean;
}) {
  const isDn = docType === "delivery-note";
  const resolved = React.useMemo(() => {
    const rows = lines.map((l) => resolveLine(l, docStatus, docType, sourceDocStatus));
    const order: Record<LineState, number> = { NOT_PACKED: 0, PARTIALLY_PACKED: 1, PENDING: 2, SHIPPED: 3 };
    return [...rows].sort((a, b) => order[a.state] - order[b.state] || a.label.localeCompare(b.label));
  }, [lines, docStatus, docType, sourceDocStatus]);

  const summary = React.useMemo(() => {
    const totalOrdered = resolved.reduce((s, r) => s + r.ordered, 0);
    const totalShipped = resolved.reduce((s, r) => s + r.shipped, 0);
    const totalBackorder = resolved.reduce((s, r) => s + r.backorder, 0);
    const complete = resolved.filter((r) => r.state === "SHIPPED").length;
    const partial = resolved.filter((r) => r.state === "PARTIALLY_PACKED").length;
    const notShipped = resolved.filter((r) => r.state === "NOT_PACKED").length;
    const pct = totalOrdered > 0 ? Math.round((totalShipped / totalOrdered) * 100) : 0;
    return { totalOrdered, totalShipped, totalBackorder, complete, partial, notShipped, pct, lineCount: resolved.length };
  }, [resolved]);

  const issueLines = resolved.filter((r) => r.state === "NOT_PACKED" || r.state === "PARTIALLY_PACKED");

  return (
    <div className="space-y-5">
      {/* Summary dashboard */}
      <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:from-slate-900/40 dark:to-background dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isDn ? "Delivery fulfilment" : "Fulfilment overview"}
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-0.5">
              {summary.pct}% {isDn ? "on this truck" : "shipped"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {fmtQty(summary.totalShipped)} of {fmtQty(summary.totalOrdered)}{" "}
              {isDn ? "on this delivery note" : "on this order"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={STATE_META.SHIPPED.badge}>
              {summary.complete} {isDn ? "on truck" : "complete"}
            </Badge>
            {summary.partial > 0 ? (
              <Badge variant="outline" className={STATE_META.PARTIALLY_PACKED.badge}>
                {summary.partial} partial
              </Badge>
            ) : null}
            {summary.notShipped > 0 ? (
              <Badge variant="outline" className={STATE_META.NOT_PACKED.badge}>
                {summary.notShipped} {isDn ? "not packed" : "not shipped"}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Stacked unit bar */}
        <div className="space-y-1.5">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {summary.totalShipped > 0 ? (
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(summary.totalShipped / summary.totalOrdered) * 100}%` }}
                title={`Shipped: ${fmtQty(summary.totalShipped)}`}
              />
            ) : null}
            {summary.totalBackorder > 0 ? (
              <div
                className="h-full bg-rose-400/90 transition-all"
                style={{ width: `${(summary.totalBackorder / summary.totalOrdered) * 100}%` }}
                title={`Backorder: ${fmtQty(summary.totalBackorder)}`}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {isDn ? "On truck" : "Shipped"} ({fmtQty(summary.totalShipped)})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              {isDn ? "Not packed" : "Backorder"} ({fmtQty(summary.totalBackorder)})
            </span>
          </div>
        </div>
      </div>

      {/* Issue callout */}
      {issueLines.length > 0 ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/80 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            {issueLines.length} line{issueLines.length === 1 ? "" : "s"} not fully packed — stock was unavailable at the warehouse
          </p>
          <ul className="mt-2 space-y-1.5 pl-6 text-sm text-amber-900/90 dark:text-amber-100/90 list-disc">
            {issueLines.map((r) => (
              <li key={r.line.id ?? r.label}>
                <span className="font-medium">{r.label}</span>
                {" — "}
                {r.line.fulfilmentReason ??
                  (r.state === "NOT_PACKED"
                    ? isDn
                      ? `${fmtQty(r.ordered)} ordered, 0 packed — ${fmtQty(r.backorder)} ${r.line.unit ?? "units"} still owed on the order`
                      : `${fmtQty(r.backorder)} ${r.line.unit ?? "units"} backordered (not packed)`
                    : `${fmtQty(r.shipped)} shipped, ${fmtQty(r.backorder)} backordered`)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Table — table-fixed keeps header and body columns aligned */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed border-collapse">
            {FULFIL_COLGROUP}
            <thead className="border-b bg-muted/40">
              <tr>
                <th className={cn(thClass, "text-left")}>Product</th>
                <th className={cn(thClass, "text-left")}>Status</th>
                <th className={cn(thClass, "text-right")}>UOM</th>
                <th className={cn(thClass, "text-right")}>Ordered</th>
                <th className={cn(thClass, "text-right")}>{isDn ? "On truck" : "Shipped"}</th>
                <th className={cn(thClass, "text-right")}>{isDn ? "Not packed" : "Backorder"}</th>
                <th className={cn(thClass, "text-left")}>Progress</th>
                <th className={cn(thClass, "text-right")}>{isDn ? "Uninvoiced" : "Open"}</th>
                <th className={cn(thClass, "text-left")}>Tax</th>
                <th className={cn(thClass, "text-right")}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((r) => {
                const meta = STATE_META[r.state];
                const taxLabel =
                  r.line.taxCodeCode != null || r.line.taxRate != null
                    ? [r.line.taxCodeCode, r.line.taxRate != null ? `${r.line.taxRate}%` : null]
                        .filter(Boolean)
                        .join(" · ")
                    : "—";

                return (
                  <tr key={r.line.id ?? r.label} className={cn("border-b last:border-b-0 text-sm", meta.row)}>
                    <td className={cn(tdClass, "border-l-4", meta.border)}>
                      <p className="font-medium leading-snug truncate">{r.label}</p>
                      {r.line.productSku?.trim() ? (
                        <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{r.line.productSku}</p>
                      ) : null}
                    </td>

                    <td className={tdClass}>
                      <Badge variant="outline" className={cn("gap-1 text-[10px] font-semibold whitespace-nowrap", meta.badge)}>
                        {meta.icon}
                        {stateLabel(r.state, docType)}
                      </Badge>
                    </td>

                    <td className={cn(tdClass, "text-right font-mono text-xs text-muted-foreground")}>{r.line.unit ?? "—"}</td>
                    <td className={cn(tdClass, "text-right tabular-nums")}>{fmtQty(r.ordered)}</td>
                    <td
                      className={cn(
                        tdClass,
                        "text-right tabular-nums font-semibold",
                        r.state === "SHIPPED" ? "text-emerald-700 dark:text-emerald-400" : ""
                      )}
                    >
                      {fmtQty(r.shipped)}
                    </td>
                    <td
                      className={cn(
                        tdClass,
                        "text-right tabular-nums font-semibold",
                        r.backorder > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
                      )}
                    >
                      {r.backorder > 0 ? fmtQty(r.backorder) : "—"}
                    </td>

                    <td className={tdClass}>
                      <div className="min-w-0 space-y-1">
                        <LineProgressBar pct={r.pct} state={r.state} />
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {r.pct}% {isDn ? "packed" : "shipped"}
                        </p>
                      </div>
                    </td>

                    <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground")}>
                      {r.remaining != null ? fmtQty(r.remaining) : "—"}
                    </td>

                    <td className={cn(tdClass, "text-xs text-muted-foreground truncate")} title={r.line.taxCodeName}>
                      {taxLabel}
                    </td>

                    <td className={cn(tdClass, "text-right")}>
                      {r.line.amount != null ? (
                        <DualCurrencyAmount
                          amount={r.line.amount}
                          currency={currency}
                          exchangeRate={exchangeRate}
                          align="right"
                          size="sm"
                          showAlternateCurrency={showAlternateCurrency && docType !== "delivery-note"}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground px-1">
        {isDn ? (
          <>
            <strong className="font-medium text-foreground">On truck</strong> = quantity physically dispatched on this
            delivery note. <strong className="font-medium text-foreground">Not packed</strong> = ordered on the sales
            order but left at the warehouse (out of stock) — still owed on a future delivery.
          </>
        ) : (
          <>
            <strong className="font-medium text-foreground">Backorder</strong> = ordered minus shipped — still owed to
            the customer on a future delivery.
          </>
        )}
      </p>
    </div>
  );
}
