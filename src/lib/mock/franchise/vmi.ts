/**
 * Mock data for /franchise/vmi — franchisee stock snapshots, replenishment orders.
 */

export interface FranchiseeStockRow {
  id?: string;
  franchiseeId: string;
  franchiseeName: string;
  sku: string;
  productName: string;
  qty: number;
  reorderPoint: number;
  minQty: number;
  maxQty: number;
  lastUpdated: string;
  suggestedOrder: number;
}

export interface VMIReplenishmentOrderRow {
  id: string;
  number: string;
  franchiseeId: string;
  franchiseeName: string;
  sourceWarehouse: string;
  status: "DRAFT" | "SENT" | "RECEIVED";
  lineCount: number;
  totalQty: number;
  createdAt: string;
  lines?: { sku: string; productName: string; qty: number }[];
}

export const MOCK_FRANCHISEE_STOCK: FranchiseeStockRow[] = [
  { franchiseeId: "f1", franchiseeName: "Nairobi West Outlet", sku: "FILLET-001", productName: "Fillet Premium", qty: 45, reorderPoint: 50, minQty: 20, maxQty: 200, lastUpdated: "2025-01-27T08:00:00Z", suggestedOrder: 155 },
  { franchiseeId: "f1", franchiseeName: "Nairobi West Outlet", sku: "GUTTED-001", productName: "Gutted Standard", qty: 30, reorderPoint: 40, minQty: 15, maxQty: 150, lastUpdated: "2025-01-27T08:00:00Z", suggestedOrder: 120 },
  { franchiseeId: "f2", franchiseeName: "Kisumu Central", sku: "FILLET-001", productName: "Fillet Premium", qty: 12, reorderPoint: 30, minQty: 10, maxQty: 100, lastUpdated: "2025-01-27T07:30:00Z", suggestedOrder: 88 },
  { franchiseeId: "f2", franchiseeName: "Kisumu Central", sku: "BYPROD-001", productName: "Byproduct (feed)", qty: 80, reorderPoint: 50, minQty: 20, maxQty: 200, lastUpdated: "2025-01-27T07:30:00Z", suggestedOrder: 0 },
];

export const MOCK_VMI_REPLENISHMENT_ORDERS: VMIReplenishmentOrderRow[] = [
  {
    id: "ro1",
    number: "RO-2025-001",
    franchiseeId: "f1",
    franchiseeName: "Nairobi West Outlet",
    sourceWarehouse: "Nairobi Cold Hub",
    status: "SENT",
    lineCount: 2,
    totalQty: 275,
    createdAt: "2025-01-27T09:00:00Z",
    lines: [
      { sku: "FILLET-001", productName: "Fillet Premium", qty: 155 },
      { sku: "GUTTED-001", productName: "Gutted Standard", qty: 120 },
    ],
  },
  {
    id: "ro2",
    number: "RO-2025-002",
    franchiseeId: "f2",
    franchiseeName: "Kisumu Central",
    sourceWarehouse: "Nairobi Cold Hub",
    status: "DRAFT",
    lineCount: 1,
    totalQty: 88,
    createdAt: "2025-01-27T09:15:00Z",
    lines: [{ sku: "FILLET-001", productName: "Fillet Premium", qty: 88 }],
  },
];

export function getMockFranchiseeStock(franchiseeId?: string): FranchiseeStockRow[] {
  let out = [...MOCK_FRANCHISEE_STOCK];
  if (franchiseeId) out = out.filter((r) => r.franchiseeId === franchiseeId);
  return out;
}

export function getMockVMIReplenishmentOrders(params?: { status?: string; franchiseeId?: string }): VMIReplenishmentOrderRow[] {
  let out = MOCK_VMI_REPLENISHMENT_ORDERS.map((r) => ({ ...r, lines: r.lines ? [...r.lines] : undefined }));
  if (params?.status) out = out.filter((r) => r.status === params.status);
  if (params?.franchiseeId) out = out.filter((r) => r.franchiseeId === params.franchiseeId);
  return out;
}

export function getMockVMISuggestions(): FranchiseeStockRow[] {
  return MOCK_FRANCHISEE_STOCK.filter((r) => r.suggestedOrder > 0);
}
