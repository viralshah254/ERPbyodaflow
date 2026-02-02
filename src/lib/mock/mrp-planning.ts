/**
 * MRP planning grid — mock data.
 * Periods × items with requirements and planned orders.
 */

export interface MrpPeriod {
  id: string;
  label: string;
  start: string;
  end: string;
}

export interface MrpItem {
  id: string;
  sku: string;
  name: string;
  uom: string;
  /** On-hand before first period */
  onHand: number;
}

export interface MrpCell {
  itemId: string;
  periodId: string;
  requirements: number;
  plannedOrders: number;
}

export const MOCK_MRP_PERIODS: MrpPeriod[] = [
  { id: "w1", label: "W1", start: "2025-02-03", end: "2025-02-09" },
  { id: "w2", label: "W2", start: "2025-02-10", end: "2025-02-16" },
  { id: "w3", label: "W3", start: "2025-02-17", end: "2025-02-23" },
  { id: "w4", label: "W4", start: "2025-02-24", end: "2025-03-02" },
  { id: "w5", label: "W5", start: "2025-03-03", end: "2025-03-09" },
  { id: "w6", label: "W6", start: "2025-03-10", end: "2025-03-16" },
];

export const MOCK_MRP_ITEMS: MrpItem[] = [
  { id: "p1", sku: "SKU-001", name: "Widget A", uom: "EA", onHand: 120 },
  { id: "p2", sku: "SKU-002", name: "Widget B", uom: "EA", onHand: 80 },
  { id: "p3", sku: "SKU-003", name: "Widget C", uom: "EA", onHand: 200 },
  { id: "p4", sku: "RAW-01", name: "Raw material Alpha", uom: "KG", onHand: 500 },
  { id: "p5", sku: "RAW-02", name: "Raw material Beta", uom: "KG", onHand: 320 },
];

/** itemId -> periodId -> cell */
const CELLS: Record<string, Record<string, { requirements: number; plannedOrders: number }>> = {
  p1: {
    w1: { requirements: 60, plannedOrders: 0 },
    w2: { requirements: 90, plannedOrders: 100 },
    w3: { requirements: 70, plannedOrders: 0 },
    w4: { requirements: 110, plannedOrders: 120 },
    w5: { requirements: 85, plannedOrders: 0 },
    w6: { requirements: 95, plannedOrders: 100 },
  },
  p2: {
    w1: { requirements: 40, plannedOrders: 50 },
    w2: { requirements: 35, plannedOrders: 0 },
    w3: { requirements: 55, plannedOrders: 60 },
    w4: { requirements: 30, plannedOrders: 0 },
    w5: { requirements: 70, plannedOrders: 80 },
    w6: { requirements: 45, plannedOrders: 0 },
  },
  p3: {
    w1: { requirements: 100, plannedOrders: 0 },
    w2: { requirements: 80, plannedOrders: 0 },
    w3: { requirements: 120, plannedOrders: 150 },
    w4: { requirements: 90, plannedOrders: 0 },
    w5: { requirements: 110, plannedOrders: 120 },
    w6: { requirements: 75, plannedOrders: 0 },
  },
  p4: {
    w1: { requirements: 200, plannedOrders: 250 },
    w2: { requirements: 180, plannedOrders: 0 },
    w3: { requirements: 220, plannedOrders: 300 },
    w4: { requirements: 190, plannedOrders: 0 },
    w5: { requirements: 210, plannedOrders: 250 },
    w6: { requirements: 170, plannedOrders: 0 },
  },
  p5: {
    w1: { requirements: 120, plannedOrders: 0 },
    w2: { requirements: 150, plannedOrders: 200 },
    w3: { requirements: 100, plannedOrders: 0 },
    w4: { requirements: 180, plannedOrders: 200 },
    w5: { requirements: 130, plannedOrders: 0 },
    w6: { requirements: 160, plannedOrders: 180 },
  },
};

export function getMrpCell(itemId: string, periodId: string): { requirements: number; plannedOrders: number } {
  const row = CELLS[itemId]?.[periodId];
  return row ?? { requirements: 0, plannedOrders: 0 };
}

export function getMrpGrid(): {
  periods: MrpPeriod[];
  items: MrpItem[];
  getCell: (itemId: string, periodId: string) => { requirements: number; plannedOrders: number };
} {
  return {
    periods: [...MOCK_MRP_PERIODS],
    items: [...MOCK_MRP_ITEMS],
    getCell: getMrpCell,
  };
}
