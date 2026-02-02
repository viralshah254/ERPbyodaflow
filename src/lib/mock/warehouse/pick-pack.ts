/**
 * Mock pick/pack data for /warehouse/pick-pack.
 */

export type PickPackStatus = "PICK" | "PACK" | "DISPATCH";

export interface PickListLineRow {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unit?: string;
  suggestedBin?: string;
  pickedQty?: number;
}

export interface PickPackOrderRow {
  id: string;
  reference: string;
  type: "delivery" | "sales-order";
  customer?: string;
  warehouse: string;
  status: PickPackStatus;
  lines: PickListLineRow[];
  cartonsCount?: number;
  packingNote?: string;
  courier?: string;
  trackingRef?: string;
}

export const MOCK_PICK_PACK: PickPackOrderRow[] = [
  {
    id: "1",
    reference: "DN-2025-001",
    type: "delivery",
    customer: "ABC Retail",
    warehouse: "WH-Main",
    status: "PICK",
    lines: [
      { id: "pl1", sku: "SKU-001", productName: "Product Alpha", quantity: 50, unit: "pcs", suggestedBin: "WH-Main-A-01-01" },
      { id: "pl2", sku: "SKU-002", productName: "Product Beta", quantity: 20, unit: "pcs", suggestedBin: "WH-Main-A-01-02" },
    ],
  },
  {
    id: "2",
    reference: "SO-2025-042",
    type: "sales-order",
    customer: "XYZ Shop",
    warehouse: "WH-Main",
    status: "PACK",
    lines: [
      { id: "pl3", sku: "SKU-001", productName: "Product Alpha", quantity: 25, unit: "pcs", suggestedBin: "WH-Main-A-01-01", pickedQty: 25 },
    ],
    cartonsCount: 1,
  },
];

export function getMockPickPack(): PickPackOrderRow[] {
  return [...MOCK_PICK_PACK];
}
