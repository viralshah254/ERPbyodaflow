/**
 * Mock landed cost templates and allocation for /inventory/costing.
 */

export interface LandedCostTemplateRow {
  id: string;
  code: string;
  name: string;
  type: "freight" | "insurance" | "duty" | "other";
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

export interface LandedCostSourceRow {
  id: string;
  type: "grn" | "bill";
  number: string;
  date: string;
  supplier?: string;
  totalAmount: number;
  currency: string;
  lines: { sku: string; productName: string; qty: number; value: number }[];
}

export const MOCK_LANDED_COST_TEMPLATES: LandedCostTemplateRow[] = [
  { id: "1", code: "FREIGHT", name: "Freight", type: "freight", allocationBasis: "weight" },
  { id: "2", code: "INS", name: "Insurance", type: "insurance", allocationBasis: "value" },
  { id: "3", code: "DUTY", name: "Import duty", type: "duty", allocationBasis: "value" },
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
];

export function getMockLandedCostTemplates(): LandedCostTemplateRow[] {
  return [...MOCK_LANDED_COST_TEMPLATES];
}

export function getMockLandedCostSources(): LandedCostSourceRow[] {
  return [...MOCK_LANDED_COST_SOURCES];
}
