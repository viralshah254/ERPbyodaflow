export interface StockRow {
  id: string;
  sku: string;
  /** Product family from catalog (optional). */
  productFamily?: string | null;
  name: string;
  warehouse: string;
  warehouseId?: string;
  location?: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  category?: string;
  /** Stock unit (e.g. KG, BOX). */
  uom?: string;
  /** Kg per box when stock is counted in boxes. */
  packSizeKg?: number | null;
}

export interface MovementRow {
  id: string;
  date: string;
  type: "IN" | "OUT" | "TRANSFER" | "ADJUST";
  sku: string;
  productName: string;
  warehouse: string;
  quantity: number;
  uom?: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
}

export function stockMovementSourceHref(row: MovementRow): string | undefined {
  if (!row.sourceId || !row.sourceType) return;
  const type = row.sourceType.toLowerCase().replace(/_/g, "-");
  const id = encodeURIComponent(row.sourceId);
  if (type === "transfer") return `/warehouse/transfers/${id}`;
  if (type === "cycle-count") return `/warehouse/cycle-counts/${id}`;
  if (type === "work-order" || type.startsWith("work-order-")) {
    return `/manufacturing/work-orders/${encodeURIComponent(row.sourceId.split(":")[0]!)}`;
  }
  if (["sales-order", "invoice", "delivery-note", "credit-note", "purchase-credit-note", "grn"].includes(type)) {
    return `/docs/${type}/${id}`;
  }
}

export function warehouseStockStateLabel(state?: string): string {
  return ({
    USABLE: "Usable warehouse",
    TRANSIT: "In transit",
    QUARANTINE: "Quarantine",
    DAMAGED: "Damaged",
    EXPIRED: "Expired",
    INACTIVE: "Inactive warehouse",
    UNCLASSIFIED: "Warehouse needs classification",
  } as Record<string, string>)[state ?? ""] ?? "Warehouse status unavailable";
}
