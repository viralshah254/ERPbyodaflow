/**
 * Mock audit log for /settings/audit-log.
 */

export interface AuditEntry {
  id: string;
  who: string;
  userId?: string;
  what: string;
  entityType: string;
  entityId: string;
  action: string;
  when: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export const MOCK_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "1",
    who: "Admin User",
    userId: "user-1",
    what: "Sales Order SO-2025-002",
    entityType: "sales-order",
    entityId: "2",
    action: "status_change",
    when: "2025-01-20T14:32:00Z",
    before: { status: "DRAFT" },
    after: { status: "PENDING_APPROVAL" },
  },
  {
    id: "2",
    who: "Admin User",
    userId: "user-1",
    what: "Product SKU-001",
    entityType: "product",
    entityId: "p1",
    action: "update",
    when: "2025-01-20T12:15:00Z",
    before: { currentStock: 100 },
    after: { currentStock: 120 },
  },
  {
    id: "3",
    who: "Admin User",
    userId: "user-1",
    what: "Journal Entry JE-2024-003",
    entityType: "journal",
    entityId: "3",
    action: "create",
    when: "2025-01-18T09:00:00Z",
    after: { memo: "Accrued expenses", totalDebit: 15000 },
  },
];

export function getMockAuditLog(limit?: number): AuditEntry[] {
  const out = [...MOCK_AUDIT_ENTRIES];
  return limit ? out.slice(0, limit) : out;
}
