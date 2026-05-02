/**
 * Human-facing line titles: prefer product **name**, then **SKU** (muted secondary).
 */

export type DeliveryLineLabelInput = {
  productName?: string | null | undefined;
  productSku?: string | null | undefined;
  description?: string | null | undefined;
};

export function deliveryLinePrimaryLabel(line: DeliveryLineLabelInput): string {
  const name = (line.productName ?? "").trim();
  if (name) return name;
  const desc = (line.description ?? "").trim();
  const sku = (line.productSku ?? "").trim();
  if (desc && sku) {
    let rest = desc;
    if (rest.startsWith(sku)) {
      rest = rest.slice(sku.length).replace(/^[\s·\-–:]*/, "").trim();
    }
    if (rest.includes(sku)) {
      rest = rest
        .split(/\s*[·\-–]\s*/)
        .filter((seg) => seg.trim() !== sku)
        .join(" · ")
        .trim();
    }
    if (rest.length > 0) return rest;
  }
  return desc || "Line";
}

export function deliveryLineSku(line: DeliveryLineLabelInput): string | undefined {
  const s = (line.productSku ?? "").trim();
  return s.length > 0 ? s : undefined;
}
