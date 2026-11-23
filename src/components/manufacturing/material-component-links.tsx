"use client";

import Link from "next/link";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import type { MaterialAvailabilityLine } from "@/lib/api/manufacturing";
import { PURCHASE_HREF, readableProductName } from "@/lib/manufacturing/material-shortage";

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
  const named = readableProductName(line.productName);
  const label = named === "Ingredient" ? readableProductName(line.productSku) : named;
  const purchased = isPurchasedSku(line.productSku);
  const barcode = line.barcode?.trim();
  const linkClass = "text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline";

  return (
    <div className="space-y-0.5">
      <Link
        href={stockHref}
        className={`inline-block font-medium text-primary underline-offset-2 hover:underline${label !== "Ingredient" ? ` ${CAPS_ON_PRODUCT_CLASS}` : ""}`}
      >
        {label}
      </Link>
      {barcode && !compact ? (
        <p className="font-mono text-[11px] text-muted-foreground">{barcode}</p>
      ) : null}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <Link href={stockHref} className={linkClass}>Stock</Link>
        <Link href={PURCHASE_HREF} className={linkClass}>Purchase</Link>
        {purchased ? null : <Link href="/manufacturing/work-orders" className={linkClass}>Work orders</Link>}
      </div>
    </div>
  );
}
