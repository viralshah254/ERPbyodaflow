/**
 * Mock data for /ap/three-way-match: PO lines, GRN lines, Bill lines.
 */

export interface POLineRow {
  id: string;
  poId: string;
  poNumber: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  supplier?: string;
}

export interface GRNLineRow {
  id: string;
  grnId: string;
  grnNumber: string;
  sku: string;
  productName: string;
  quantity: number;
  warehouse?: string;
}

export interface BillLineRow {
  id: string;
  billId: string;
  billNumber: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export const MOCK_PO_LINES: POLineRow[] = [
  { id: "pol1", poId: "1", poNumber: "PO-2025-001", sku: "SKU-001", productName: "Product Alpha", quantity: 100, unitPrice: 500, amount: 50000, supplier: "Supplier A" },
  { id: "pol2", poId: "1", poNumber: "PO-2025-001", sku: "SKU-002", productName: "Product Beta", quantity: 50, unitPrice: 1200, amount: 60000, supplier: "Supplier A" },
];

export const MOCK_GRN_LINES: GRNLineRow[] = [
  { id: "grnl1", grnId: "1", grnNumber: "GRN-001", sku: "SKU-001", productName: "Product Alpha", quantity: 98, warehouse: "WH-Main" },
  { id: "grnl2", grnId: "1", grnNumber: "GRN-001", sku: "SKU-002", productName: "Product Beta", quantity: 50, warehouse: "WH-Main" },
];

export const MOCK_BILL_LINES: BillLineRow[] = [
  { id: "bll1", billId: "1", billNumber: "BILL-1", sku: "SKU-001", productName: "Product Alpha", quantity: 98, unitPrice: 510, amount: 49980 },
  { id: "bll2", billId: "1", billNumber: "BILL-1", sku: "SKU-002", productName: "Product Beta", quantity: 50, unitPrice: 1200, amount: 60000 },
];

export function getMockPOLines(): POLineRow[] {
  return [...MOCK_PO_LINES];
}

export function getMockGRNLines(): GRNLineRow[] {
  return [...MOCK_GRN_LINES];
}

export function getMockBillLines(): BillLineRow[] {
  return [...MOCK_BILL_LINES];
}
