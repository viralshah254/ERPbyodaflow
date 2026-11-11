"use client";
import { Table as InteractiveTable } from "@/components/ui/table";


import * as React from "react";
import { Package, PackageCheck, PackageX, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { DocumentLineProductDescription } from "@/components/docs/DocumentLineProductDescription";
import { LinePackingCell } from "@/components/docs/LinePackingCell";
import { deliveryLinePrimaryLabel } from "@/lib/documents/format-delivery-line";
import { resolveSalesUomQty, scaleQtyWithHeal } from "@/lib/documents/sales-uom-qty";
import type { DocumentDetailRecord } from "@/lib/types/documents";
import { cn } from "@/lib/utils";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";

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

const thClass = "px-2 py-2 text-xs font-medium text-muted-foreground align-middle";
const tdClass = "px-2 py-2 align-middle";

export function DocumentFulfilmentLinesTable({
  lines,
  currency,
  exchangeRate,
  docType,
  docStatus,
  sourceDocStatus,
  showAlternateCurrency = true,
  fmcgOrg = false,
}: {
  lines: FulfilmentLine[];
  currency: string;
  exchangeRate?: number;
  docType: "sales-order" | "delivery-note";
  docStatus?: string;
  sourceDocStatus?: string;
  showAlternateCurrency?: boolean;
  fmcgOrg?: boolean;
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
    <div className="space-y-3">
      {/* Summary dashboard */}
      <div className="rounded-md border bg-muted/20 p-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isDn ? "Delivery fulfilment" : "Fulfilment overview"}
            </p>
            <p className="text-base font-semibold tabular-nums mt-0.5">
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
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
        <details className="rounded-md border border-amber-300/60 bg-amber-50/80 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-950/30">
          <summary className="cursor-pointer text-sm font-medium text-amber-950 dark:text-amber-100">
            {issueLines.length} line{issueLines.length === 1 ? "" : "s"} with shortages
          </summary>
          <ul className="mt-2 space-y-1.5 pl-6 text-sm text-amber-900/90 dark:text-amber-100/90 list-disc">
            {issueLines.map((r) => (
              <li key={r.line.id ?? r.label}>
                <span className={cn("font-medium", CAPS_ON_PRODUCT_CLASS)}>{r.label}</span>
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
        </details>
      ) : null}

      <div className="fulfilment-lines rounded-md border">
          <InteractiveTable className="w-full table-fixed border-collapse" role="table">
            <thead role="rowgroup" className="border-b bg-muted/40">
              <tr role="row">
                <th scope="col" role="columnheader" className={cn(thClass, "text-left")}>Product</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-left")}>Status</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right")}>UOM</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right")}>Ordered</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right")}>{isDn ? "On truck" : "Shipped"}</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right")}>{isDn ? "Not packed" : "Backorder"}</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-left")}>Progress</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right")}>{isDn ? "Uninvoiced" : "Open"}</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right whitespace-nowrap")}>Disc %</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-left")}>Tax</th>
                <th scope="col" role="columnheader" className={cn(thClass, "text-right")}>Amount</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {resolved.map((r) => {
                const meta = STATE_META[r.state];
                const taxLabel =
                  r.line.taxCodeCode != null || r.line.taxRate != null
                    ? [r.line.taxCodeCode, r.line.taxRate != null ? `${r.line.taxRate}%` : null]
                        .filter(Boolean)
                        .join(" · ")
                    : "—";

                return (
                  <tr role="row" key={r.line.id ?? r.label} className={cn("border-b last:border-b-0 text-sm", meta.row)}>
                    <td role="cell" data-line-label="Product" className={cn(tdClass, "border-l-4", meta.border)}>
                      <DocumentLineProductDescription
                        line={r.line}
                        fmcgOrg={fmcgOrg}
                        nameClassName="font-medium leading-snug [overflow-wrap:anywhere]"
                      />
                    </td>

                    <td role="cell" data-line-label="Status" className={tdClass}>
                      <Badge variant="outline" className={cn("gap-1 text-[10px] font-semibold whitespace-normal", meta.badge)}>
                        {meta.icon}
                        {stateLabel(r.state, docType)}
                      </Badge>
                    </td>

                    <td role="cell" data-line-label="UOM" className={cn(tdClass, "text-right")}>
                      <LinePackingCell unit={r.line.unit} packing={r.line.packing} />
                    </td>
                    <td role="cell" data-line-label="Ordered" className={cn(tdClass, "text-right tabular-nums")}>{fmtQty(r.ordered)}</td>
                    <td role="cell" data-line-label={isDn ? "On truck" : "Shipped"}
                      className={cn(
                        tdClass,
                        "text-right tabular-nums font-semibold",
                        r.state === "SHIPPED" ? "text-emerald-700 dark:text-emerald-400" : ""
                      )}
                    >
                      {fmtQty(r.shipped)}
                    </td>
                    <td role="cell" data-line-label={isDn ? "Not packed" : "Backorder"}
                      className={cn(
                        tdClass,
                        "text-right tabular-nums font-semibold",
                        r.backorder > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
                      )}
                    >
                      {r.backorder > 0 ? fmtQty(r.backorder) : "—"}
                    </td>

                    <td role="cell" data-line-label="Progress" className={tdClass}>
                      <div className="min-w-0 space-y-1">
                        <LineProgressBar pct={r.pct} state={r.state} />
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {r.pct}% {isDn ? "packed" : "shipped"}
                        </p>
                      </div>
                    </td>

                    <td role="cell" data-line-label={isDn ? "Uninvoiced" : "Open"} className={cn(tdClass, "text-right tabular-nums text-muted-foreground")}>
                      {r.remaining != null ? fmtQty(r.remaining) : "—"}
                    </td>

                    <td role="cell" data-line-label="Discount" className={cn(tdClass, "text-right tabular-nums text-muted-foreground text-xs")}>
                      {(r.line.discount ?? 0) > 0 ? `${r.line.discount}%` : "—"}
                    </td>

                    <td role="cell" data-line-label="Tax" className={cn(tdClass, "text-xs text-muted-foreground")} title={r.line.taxCodeName}>
                      {taxLabel}
                    </td>

                    <td role="cell" data-line-label="Amount" className={cn(tdClass, "text-right")}>
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
          </InteractiveTable>
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
