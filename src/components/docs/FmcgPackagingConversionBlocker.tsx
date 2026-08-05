"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PackagingMissingLine = {
  productId: string;
  unit: string;
  description?: string;
  productName?: string;
  productSku?: string;
};

export function productPackagingHref(productId: string): string {
  return `/master/products/${productId}?tab=packaging`;
}

export function packagingMissingLineLabel(m: PackagingMissingLine): string {
  if (m.productName) {
    return m.productSku ? `${m.productSku} — ${m.productName}` : m.productName;
  }
  return m.description || m.productId;
}

/** Shown when FMCG pack UOMs on a sales order lack pieces-per-pack on the product. */
export function FmcgPackagingConversionBlocker({
  missingLines,
  className,
  compact = false,
}: {
  missingLines: PackagingMissingLine[];
  className?: string;
  compact?: boolean;
}) {
  if (!missingLines.length) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-300/70 bg-amber-50 text-sm text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-50",
        compact ? "px-3 py-2" : "px-4 py-3",
        className
      )}
    >
      <p className={cn("font-medium flex items-start gap-2 leading-snug", compact && "text-xs")}>
        <Icons.AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Cannot create a delivery note yet — a line uses a pack UOM without{" "}
          <strong>pieces per pack</strong> on the ERP product. Open each product&apos;s{" "}
          <strong>Packs</strong> tab (not the SFA name on the order line), set e.g. 1 CARTON = 24 PCS,
          then refresh this order.
        </span>
      </p>
      <ul className={cn("mt-3 space-y-2", compact ? "text-xs" : "text-sm")}>
        {missingLines.map((m) => (
          <li
            key={`${m.productId}-${m.unit}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/30 bg-background/60 px-2.5 py-2"
          >
            <span>
              <span className="font-medium">{packagingMissingLineLabel(m)}</span>
              <span className="text-muted-foreground"> — set pieces per {m.unit}</span>
            </span>
            <Button size="sm" variant="secondary" className="h-7 shrink-0" asChild>
              <Link href={productPackagingHref(m.productId)}>Set packaging</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
