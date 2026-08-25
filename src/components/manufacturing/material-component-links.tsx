"use client";

import Link from "next/link";
import type { MaterialAvailabilityLine } from "@/lib/api/manufacturing";

export function materialStockHref(line: Pick<MaterialAvailabilityLine, "productSku" | "productName">): string {
  return `/inventory/stock-levels?search=${encodeURIComponent(line.productSku || line.productName)}`;
}

function isPurchasedSku(sku?: string): boolean {
  const prefix = (sku ?? "").toUpperCase();
  return prefix.startsWith("RAW") || prefix.startsWith("PKG") || prefix.startsWith("RM-");
}

export function MaterialComponentLinks({
  line,
  compact = false,
}: {
  line: MaterialAvailabilityLine;
  compact?: boolean;
}) {
  const stockHref = materialStockHref(line);
  const label = line.productSku
    ? compact
      ? line.productSku
      : `${line.productSku} — ${line.productName}`
    : line.productName;
  const purchased = isPurchasedSku(line.productSku);

  return (
    <div className="space-y-0.5">
      <Link
        href={stockHref}
        className="inline-block whitespace-nowrap font-medium text-primary underline-offset-2 hover:underline"
      >
        {label}
      </Link>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <Link
          href={stockHref}
          className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          Stock
        </Link>
        {purchased ? (
          <Link
            href="/docs/purchase-order/new"
            className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            Purchase
          </Link>
        ) : (
          <Link
            href="/manufacturing/work-orders"
            className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            Work orders
          </Link>
        )}
      </div>
    </div>
  );
}
