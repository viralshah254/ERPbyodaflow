import {
  getMockPurchaseOrders,
  getMockPurchaseReturns,
  type PurchasingDocRow,
} from "@/lib/mock/purchasing";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

export interface PurchaseOrderDetailRow extends PurchasingDocRow {
  supplier: string;
  currency: string;
  fxRate: number;
  country: "Kenya" | "Uganda";
  region: string;
  cashMode: "CASH" | "CREDIT";
  lines: Array<{
    id: string;
    sku: string;
    productName: string;
    qty: number;
    uom: string;
    rate: number;
    total: number;
  }>;
}

const PURCHASE_ORDERS_KEY = "odaflow_purchase_orders";
const PURCHASE_RETURNS_KEY = "odaflow_purchase_returns";

function seedOrders(): PurchaseOrderDetailRow[] {
  return [
    {
      id: "1",
      number: "PO-2025-001",
      date: "2025-01-10",
      supplier: "Supplier A",
      party: "Supplier A",
      total: 250000,
      status: "APPROVED",
      currency: "KES",
      fxRate: 1,
      country: "Kenya",
      region: "Kisumu",
      cashMode: "CASH",
      lines: [
        { id: "pol1", sku: "ROUND-001", productName: "Round Fish", qty: 500, uom: "kg", rate: 320, total: 160000 },
        { id: "pol2", sku: "ROUND-002", productName: "Round Fish (small)", qty: 250, uom: "kg", rate: 360, total: 90000 },
      ],
    },
    {
      id: "2",
      number: "PO-2025-002",
      date: "2025-01-12",
      supplier: "Supplier B",
      party: "Supplier B",
      total: 185000,
      status: "PENDING_APPROVAL",
      currency: "UGX",
      fxRate: 0.036,
      country: "Uganda",
      region: "Jinja",
      cashMode: "CASH",
      lines: [{ id: "pol3", sku: "ROUND-001", productName: "Round Fish", qty: 300, uom: "kg", rate: 616.67, total: 185000 }],
    },
    {
      id: "3",
      number: "PO-2025-003",
      date: "2025-01-14",
      supplier: "Supplier C",
      party: "Supplier C",
      total: 92000,
      status: "RECEIVED",
      currency: "KES",
      fxRate: 1,
      country: "Kenya",
      region: "Busia",
      cashMode: "CREDIT",
      lines: [{ id: "pol4", sku: "ROUND-001", productName: "Round Fish", qty: 220, uom: "kg", rate: 418.18, total: 92000 }],
    },
  ];
}

function seedPurchaseReturns(): PurchasingDocRow[] {
  return getMockPurchaseReturns().map((row) => ({ ...row }));
}

export function listPurchaseOrders(): PurchaseOrderDetailRow[] {
  return loadStoredValue(PURCHASE_ORDERS_KEY, seedOrders).map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

export function getPurchaseOrderById(id: string): PurchaseOrderDetailRow | null {
  return listPurchaseOrders().find((row) => row.id === id) ?? null;
}

export function updatePurchaseOrderStatuses(ids: string[], status: string): void {
  saveStoredValue(
    PURCHASE_ORDERS_KEY,
    listPurchaseOrders().map((row) => (ids.includes(row.id) ? { ...row, status } : row))
  );
}

export function listPurchaseReturns(): PurchasingDocRow[] {
  return loadStoredValue(PURCHASE_RETURNS_KEY, seedPurchaseReturns).map((row) => ({ ...row }));
}

export function createPurchaseReturn(row: Omit<PurchasingDocRow, "id" | "number" | "status">): PurchasingDocRow {
  const created: PurchasingDocRow = {
    ...row,
    id: `pret-${Date.now()}`,
    number: `PRET-${String(listPurchaseReturns().length + 1).padStart(3, "0")}`,
    status: "DRAFT",
  };
  saveStoredValue(PURCHASE_RETURNS_KEY, [created, ...listPurchaseReturns()]);
  return created;
}

export function updatePurchaseReturnStatus(id: string, status: string): void {
  saveStoredValue(
    PURCHASE_RETURNS_KEY,
    listPurchaseReturns().map((row) => (row.id === id ? { ...row, status } : row))
  );
}

export function resetPurchaseOrdersFromMocks(): void {
  saveStoredValue(PURCHASE_ORDERS_KEY, seedOrders());
}

export function resetPurchaseReturnsFromMocks(): void {
  saveStoredValue(PURCHASE_RETURNS_KEY, seedPurchaseReturns());
}

