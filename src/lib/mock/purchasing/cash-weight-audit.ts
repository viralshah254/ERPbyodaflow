/**
 * Mock data for /purchasing/cash-weight-audit — PO vs Cash disbursement vs Received weight.
 */

export interface CashDisbursementRow {
  id: string;
  poId: string;
  poNumber: string;
  amount: number;
  currency: string;
  paidAt: string;
  reference: string;
  status: "PENDING" | "RECONCILED";
}

export interface CashWeightAuditLineRow {
  id: string;
  poId: string;
  poNumber: string;
  poLineId: string;
  sku: string;
  productName: string;
  orderedQty: number;
  paidWeightKg: number | null;
  receivedWeightKg: number | null;
  varianceKg: number | null;
  disbursementId: string | null;
  disbursementReference: string | null;
  grnId: string | null;
  status: "MATCHED" | "VARIANCE" | "PENDING";
  exceptionStatus?: "OPEN" | "INVESTIGATING" | "APPROVED" | "RESOLVED" | null;
  assignedToUserId?: string | null;
  assignedAt?: string | null;
  dueAt?: string | null;
  investigationNotes?: string | null;
  resolutionNotes?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  slaAgeHours?: number;
  slaOverdue?: boolean;
}

export const MOCK_CASH_DISBURSEMENTS: CashDisbursementRow[] = [
  { id: "cd1", poId: "po1", poNumber: "PO-2025-001", amount: 185000, currency: "KES", paidAt: "2025-01-18", reference: "Farm gate CoD - Lake", status: "RECONCILED" },
  { id: "cd2", poId: "po2", poNumber: "PO-2025-002", amount: 92000, currency: "UGX", paidAt: "2025-01-19", reference: "Border CoD", status: "PENDING" },
];

export const MOCK_CASH_WEIGHT_AUDIT_LINES: CashWeightAuditLineRow[] = [
  { id: "al1", poId: "po1", poNumber: "PO-2025-001", poLineId: "pol1", sku: "ROUND-001", productName: "Round Fish", orderedQty: 500, paidWeightKg: 480, receivedWeightKg: 472, varianceKg: -8, disbursementId: "cd1", disbursementReference: "CD-2025-001", grnId: "grn1", status: "VARIANCE", exceptionStatus: "OPEN", dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), slaAgeHours: 6, slaOverdue: false },
  { id: "al2", poId: "po1", poNumber: "PO-2025-001", poLineId: "pol2", sku: "ROUND-002", productName: "Round Fish (small)", orderedQty: 200, paidWeightKg: 195, receivedWeightKg: 195, varianceKg: 0, disbursementId: "cd1", disbursementReference: "CD-2025-001", grnId: "grn1", status: "MATCHED" },
  { id: "al3", poId: "po2", poNumber: "PO-2025-002", poLineId: "pol3", sku: "ROUND-001", productName: "Round Fish", orderedQty: 300, paidWeightKg: null, receivedWeightKg: null, varianceKg: null, disbursementId: "cd2", disbursementReference: "CD-2025-002", grnId: null, status: "PENDING" },
];

export function getMockCashDisbursements(poId?: string): CashDisbursementRow[] {
  let out = [...MOCK_CASH_DISBURSEMENTS];
  if (poId) out = out.filter((d) => d.poId === poId);
  return out;
}

export function getMockCashWeightAuditLines(params?: { poId?: string; status?: string }): CashWeightAuditLineRow[] {
  let out = [...MOCK_CASH_WEIGHT_AUDIT_LINES];
  if (params?.poId) out = out.filter((l) => l.poId === params.poId);
  if (params?.status) out = out.filter((l) => l.status === params.status);
  return out;
}
