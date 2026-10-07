"use client";

import Link from "next/link";
import type { MaterialAvailabilityLine } from "@/lib/api/manufacturing";

export function materialStockHref(
  line: Pick<MaterialAvailabilityLine, "productSku" | "productName" | "barcode">
): string {
  return `/inventory/stock-levels?search=${encodeURIComponent(
    line.barcode || line.productName || line.productSku || ""
  )}`;
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
  const label = line.productName || line.productSku || line.productId;
  const purchased = isPurchasedSku(line.productSku);
  const barcode = line.barcode?.trim();

  return (
    <div className="space-y-0.5">
      <Link
        href={stockHref}
        className="inline-block font-medium text-primary underline-offset-2 hover:underline"
      >
        {label}
      </Link>
      {barcode && !compact ? (
        <p className="font-mono text-[11px] text-muted-foreground">{barcode}</p>
      ) : null}
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
