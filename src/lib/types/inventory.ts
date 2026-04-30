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
  reference?: string;
}
