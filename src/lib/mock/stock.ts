/**
 * Mock data for /inventory/stock: stock by warehouse, low stock alerts.
 */

export interface StockRow {
  id: string;
  sku: string;
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
}

export const MOCK_STOCK: StockRow[] = [
  { id: "1", sku: "SKU-001", name: "Product Alpha", warehouse: "WH-Main", location: "A-01-02", quantity: 150, reserved: 25, available: 125, reorderLevel: 50, status: "In Stock", category: "Category A" },
  { id: "2", sku: "SKU-002", name: "Product Beta", warehouse: "WH-Main", location: "A-02-03", quantity: 75, reserved: 10, available: 65, reorderLevel: 100, status: "Low Stock", category: "Category B" },
  { id: "3", sku: "SKU-003", name: "Product Gamma", warehouse: "WH-Main", location: "B-01-01", quantity: 0, reserved: 0, available: 0, reorderLevel: 20, status: "Out of Stock", category: "Category A" },
  { id: "4", sku: "SKU-001", name: "Product Alpha", warehouse: "WH-East", location: "A-01", quantity: 30, reserved: 0, available: 30, reorderLevel: 20, status: "In Stock", category: "Category A" },
];

export function getMockStock(filters?: { warehouse?: string; category?: string }): StockRow[] {
  let out = [...MOCK_STOCK];
  if (filters?.warehouse) {
    out = out.filter((r) => r.warehouse === filters.warehouse);
  }
  if (filters?.category) {
    out = out.filter((r) => r.category === filters.category);
  }
  return out;
}

export function getLowStockItems(): StockRow[] {
  return MOCK_STOCK.filter((r) => r.status === "Low Stock" || r.status === "Out of Stock");
}
