"use client";

import { Badge } from "@/components/ui/badge";
import type { ProductKind } from "@/lib/products/product-type";
import { productTypeLabel } from "@/lib/products/product-type";

type WhenUnset = "dash" | "stock";

function badgeClass(type: ProductKind | string | undefined | null): string {
  if (type === "RAW") return "border-blue-500/30 bg-blue-500/10 text-blue-400";
  if (type === "FINISHED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return "border-violet-500/30 bg-violet-500/10 text-violet-400";
}

export function ProductTypeBadge({
  type,
  whenUnset = "dash",
}: {
  type: ProductKind | string | undefined | null;
  /** List views: em dash when unset. Detail: legacy products show as stock. */
  whenUnset?: WhenUnset;
}) {
  const unset = type == null || type === "";
  if (unset && whenUnset === "dash") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const effective = unset ? "BOTH" : type;
  return (
    <Badge variant="outline" className={badgeClass(effective)}>
      {productTypeLabel(effective)}
    </Badge>
  );
}
