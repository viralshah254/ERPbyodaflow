/**
 * Mock putaway data for /warehouse/putaway (GRNs awaiting putaway).
 */

export interface PutawayLineRow {
  id: string;
  grnId: string;
  grnNumber: string;
  sku: string;
  productName: string;
  receivedQty: number;
  putawayQty: number;
  unit?: string;
  allocatedBins?: { binCode: string; qty: number }[];
}

export interface PutawayGRNRow {
  id: string;
  grnNumber: string;
  date: string;
  warehouse: string;
  poRef?: string;
  lines: PutawayLineRow[];
}

export const MOCK_PUTAWAY: PutawayGRNRow[] = [
  {
    id: "1",
    grnNumber: "GRN-004",
    date: "2025-01-28",
    warehouse: "WH-Main",
    poRef: "PO-2025-003",
    lines: [
      { id: "pa1", grnId: "1", grnNumber: "GRN-004", sku: "SKU-001", productName: "Product Alpha", receivedQty: 100, putawayQty: 0, unit: "pcs" },
      { id: "pa2", grnId: "1", grnNumber: "GRN-004", sku: "SKU-002", productName: "Product Beta", receivedQty: 50, putawayQty: 50, unit: "pcs", allocatedBins: [{ binCode: "WH-Main-A-01-02", qty: 50 }] },
    ],
  },
];

export function getMockPutaway(): PutawayGRNRow[] {
  return [...MOCK_PUTAWAY];
}
