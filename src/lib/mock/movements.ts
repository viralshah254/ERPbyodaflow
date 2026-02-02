/**
 * Mock data for /inventory/movements.
 */

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

export const MOCK_MOVEMENTS: MovementRow[] = [
  { id: "1", date: "2025-01-20", type: "IN", sku: "SKU-001", productName: "Product Alpha", warehouse: "WH-Main", quantity: 50, reference: "GRN-001" },
  { id: "2", date: "2025-01-19", type: "OUT", sku: "SKU-002", productName: "Product Beta", warehouse: "WH-Main", quantity: -20, reference: "SO-2025-001" },
  { id: "3", date: "2025-01-18", type: "ADJUST", sku: "SKU-003", productName: "Product Gamma", warehouse: "WH-Main", quantity: 5, reference: "Stocktake" },
  { id: "4", date: "2025-01-17", type: "TRANSFER", sku: "SKU-001", productName: "Product Alpha", warehouse: "WH-Main", quantity: -30, reference: "TRF-001" },
  { id: "5", date: "2025-01-17", type: "TRANSFER", sku: "SKU-001", productName: "Product Alpha", warehouse: "WH-East", quantity: 30, reference: "TRF-001" },
];

export function getMockMovements(filters?: { warehouse?: string; type?: string }): MovementRow[] {
  let out = [...MOCK_MOVEMENTS];
  if (filters?.warehouse) {
    out = out.filter((r) => r.warehouse === filters.warehouse);
  }
  if (filters?.type) {
    out = out.filter((r) => r.type === filters.type);
  }
  return out;
}
