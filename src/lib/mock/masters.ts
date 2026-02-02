/**
 * Mock data for master entities: products, parties (customers/suppliers), warehouses.
 */

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  /** Base UOM for conversions (EA, KG, etc.). */
  baseUom?: string;
  status: string;
  currentStock?: number;
}

export interface PartyRow {
  id: string;
  name: string;
  type: "customer" | "supplier";
  email?: string;
  phone?: string;
  status: string;
}

export interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  branch?: string;
  status: string;
}

export const MOCK_PRODUCTS: ProductRow[] = [
  { id: "p1", sku: "SKU-001", name: "Product Alpha", category: "Category A", unit: "pcs", baseUom: "EA", status: "ACTIVE", currentStock: 120 },
  { id: "p2", sku: "SKU-002", name: "Product Beta", category: "Category B", unit: "pcs", baseUom: "EA", status: "ACTIVE", currentStock: 45 },
  { id: "p3", sku: "SKU-003", name: "Product Gamma", category: "Category A", unit: "kg", baseUom: "KG", status: "INACTIVE", currentStock: 0 },
];

export const MOCK_PARTIES: PartyRow[] = [
  { id: "c1", name: "ABC Retail", type: "customer", email: "abc@retail.com", status: "ACTIVE" },
  { id: "c2", name: "XYZ Shop", type: "customer", email: "xyz@shop.com", status: "ACTIVE" },
  { id: "s1", name: "Global Suppliers Ltd", type: "supplier", email: "procure@global.com", status: "ACTIVE" },
  { id: "s2", name: "Local Wholesale Co", type: "supplier", status: "ACTIVE" },
];

export const MOCK_WAREHOUSES: WarehouseRow[] = [
  { id: "w1", code: "WH-Main", name: "Main Warehouse", branch: "Head Office", status: "ACTIVE" },
  { id: "w2", code: "WH-East", name: "East Branch Warehouse", branch: "East", status: "ACTIVE" },
];

export function getMockProducts(): ProductRow[] {
  return [...MOCK_PRODUCTS];
}

export function getMockParties(type?: "customer" | "supplier"): PartyRow[] {
  if (type) return MOCK_PARTIES.filter((p) => p.type === type);
  return [...MOCK_PARTIES];
}

export function getMockWarehouses(): WarehouseRow[] {
  return [...MOCK_WAREHOUSES];
}
