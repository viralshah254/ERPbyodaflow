/**
 * Mock data for /manufacturing/subcontracting — external work centers, subcontract orders, WIP.
 */

export interface ExternalWorkCenterRow {
  id: string;
  code: string;
  name: string;
  type: "FACTORY" | "GROUP";
  address?: string;
  isActive: boolean;
}

export interface SubcontractOrderLineRow {
  id: string;
  orderId: string;
  sku: string;
  productName: string;
  type: "INPUT" | "OUTPUT_PRIMARY" | "OUTPUT_SECONDARY" | "WASTE";
  quantity: number;
  uom: string;
  processingFeePerUnit: number | null;
  amount: number | null;
}

export interface SubcontractOrderRow {
  id: string;
  number: string;
  workCenterId: string;
  workCenterName: string;
  bomId: string | null;
  bomName: string | null;
  status: "SENT" | "WIP" | "RECEIVED";
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  lines?: SubcontractOrderLineRow[];
}

export interface WIPBalanceRow {
  workCenterId: string;
  workCenterName: string;
  sku: string;
  productName: string;
  quantity: number;
  uom: string;
  lastMovementAt: string;
}

export const MOCK_EXTERNAL_WORK_CENTERS: ExternalWorkCenterRow[] = [
  { id: "wc1", code: "FACT-NAI", name: "Nairobi Industrial Factory", type: "FACTORY", address: "Industrial Area, Nairobi", isActive: true },
  { id: "wc2", code: "WG-KIS", name: "Kisumu Women's Group", type: "GROUP", address: "Kisumu", isActive: true },
];

export const MOCK_SUBCONTRACT_ORDERS: SubcontractOrderRow[] = [
  {
    id: "so1",
    number: "SCO-2025-001",
    workCenterId: "wc1",
    workCenterName: "Nairobi Industrial Factory",
    bomId: "bom1",
    bomName: "Round Fish → Fillet + Byproduct",
    status: "WIP",
    sentAt: "2025-01-22",
    receivedAt: null,
    createdAt: "2025-01-22T08:00:00Z",
    lines: [
      { id: "sol1", orderId: "so1", sku: "ROUND-001", productName: "Round Fish", type: "INPUT", quantity: 1000, uom: "kg", processingFeePerUnit: null, amount: null },
      { id: "sol2", orderId: "so1", sku: "FILLET-001", productName: "Fillet Premium", type: "OUTPUT_PRIMARY", quantity: 0, uom: "kg", processingFeePerUnit: 25, amount: null },
      { id: "sol3", orderId: "so1", sku: "BYPROD-001", productName: "Byproduct (feed)", type: "OUTPUT_SECONDARY", quantity: 0, uom: "kg", processingFeePerUnit: 5, amount: null },
    ],
  },
  {
    id: "so2",
    number: "SCO-2025-002",
    workCenterId: "wc2",
    workCenterName: "Kisumu Women's Group",
    bomId: "bom2",
    bomName: "Round Fish → Gutted",
    status: "RECEIVED",
    sentAt: "2025-01-20",
    receivedAt: "2025-01-21",
    createdAt: "2025-01-20T10:00:00Z",
    lines: [
      { id: "sol4", orderId: "so2", sku: "ROUND-001", productName: "Round Fish", type: "INPUT", quantity: 500, uom: "kg", processingFeePerUnit: null, amount: null },
      { id: "sol5", orderId: "so2", sku: "GUTTED-001", productName: "Gutted Standard", type: "OUTPUT_PRIMARY", quantity: 480, uom: "kg", processingFeePerUnit: 15, amount: 7200 },
    ],
  },
];

export const MOCK_WIP_BALANCES: WIPBalanceRow[] = [
  { workCenterId: "wc1", workCenterName: "Nairobi Industrial Factory", sku: "ROUND-001", productName: "Round Fish", quantity: 1000, uom: "kg", lastMovementAt: "2025-01-22T08:00:00Z" },
  { workCenterId: "wc1", workCenterName: "Nairobi Industrial Factory", sku: "FILLET-001", productName: "Fillet Premium", quantity: 0, uom: "kg", lastMovementAt: "2025-01-22T08:00:00Z" },
];

export function getMockExternalWorkCenters(): ExternalWorkCenterRow[] {
  return [...MOCK_EXTERNAL_WORK_CENTERS];
}

export function getMockSubcontractOrders(params?: { workCenterId?: string; status?: string }): SubcontractOrderRow[] {
  let out = MOCK_SUBCONTRACT_ORDERS.map((o) => ({ ...o, lines: o.lines ? [...o.lines] : undefined }));
  if (params?.workCenterId) out = out.filter((o) => o.workCenterId === params.workCenterId);
  if (params?.status) out = out.filter((o) => o.status === params.status);
  return out;
}

export function getMockSubcontractOrderById(id: string): SubcontractOrderRow | null {
  return MOCK_SUBCONTRACT_ORDERS.find((o) => o.id === id) ?? null;
}

export function getMockWIPBalances(workCenterId?: string): WIPBalanceRow[] {
  let out = [...MOCK_WIP_BALANCES];
  if (workCenterId) out = out.filter((b) => b.workCenterId === workCenterId);
  return out;
}
