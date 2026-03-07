/**
 * Mock landed cost templates and allocation for /inventory/costing.
 * Cool Catch: permit, border, inbound_freight, outbound_freight; multi-currency (KES/UGX); allocation by weight.
 */

export type LandedCostType =
  | "freight"
  | "insurance"
  | "duty"
  | "other"
  | "permit"
  | "border"
  | "inbound_freight"
  | "outbound_freight"
  | "storage";

export interface LandedCostTemplateRow {
  id: string;
  code: string;
  name: string;
  type: LandedCostType;
  allocationBasis: "qty" | "value" | "weight";
}

export interface LandedCostLineRow {
  id: string;
  templateId: string;
  templateName: string;
  amount: number;
  currency: string;
  allocationBasis: "qty" | "value" | "weight";
}

export interface LandedCostSourceLine {
  sku: string;
  productName: string;
  qty: number;
  value: number;
  /** For allocation by weight (Cool Catch / fish). */
  weightKg?: number;
}

export interface LandedCostSourceRow {
  id: string;
  type: "grn" | "bill";
  number: string;
  date: string;
  supplier?: string;
  totalAmount: number;
  currency: string;
  lines: LandedCostSourceLine[];
}

export const MOCK_LANDED_COST_TEMPLATES: LandedCostTemplateRow[] = [
  { id: "1", code: "FREIGHT", name: "Freight", type: "freight", allocationBasis: "weight" },
  { id: "2", code: "INS", name: "Insurance", type: "insurance", allocationBasis: "value" },
  { id: "3", code: "DUTY", name: "Import duty", type: "duty", allocationBasis: "value" },
  { id: "4", code: "PERMIT", name: "Permits", type: "permit", allocationBasis: "weight" },
  { id: "5", code: "BORDER", name: "Border / customs", type: "border", allocationBasis: "value" },
  { id: "6", code: "IN-FREIGHT", name: "Inbound freight (farm → factory/hub)", type: "inbound_freight", allocationBasis: "weight" },
  { id: "7", code: "OUT-FREIGHT", name: "Outbound freight (hub → customer)", type: "outbound_freight", allocationBasis: "weight" },
  { id: "8", code: "STORAGE", name: "Cold storage", type: "storage", allocationBasis: "weight" },
];

export const MOCK_LANDED_COST_SOURCES: LandedCostSourceRow[] = [
  {
    id: "grn1",
    type: "grn",
    number: "GRN-001",
    date: "2025-01-18",
    supplier: "Global Suppliers Ltd",
    totalAmount: 85000,
    currency: "KES",
    lines: [
      { sku: "SKU-001", productName: "Product Alpha", qty: 100, value: 50000 },
      { sku: "SKU-002", productName: "Product Beta", qty: 50, value: 35000 },
    ],
  },
  {
    id: "grn2",
    type: "grn",
    number: "GRN-002",
    date: "2025-01-20",
    supplier: "Lake Victoria Fish Co",
    totalAmount: 120000,
    currency: "UGX",
    lines: [
      { sku: "ROUND-001", productName: "Round Fish", qty: 500, value: 80000, weightKg: 480 },
      { sku: "ROUND-002", productName: "Round Fish (small)", qty: 200, value: 40000, weightKg: 195 },
    ],
  },
];

export function getMockLandedCostTemplates(): LandedCostTemplateRow[] {
  return [...MOCK_LANDED_COST_TEMPLATES];
}

export function getMockLandedCostSources(): LandedCostSourceRow[] {
  return [...MOCK_LANDED_COST_SOURCES];
}
