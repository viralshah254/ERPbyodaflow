/**
 * Mock approvals for /approvals/inbox and /approvals/requests.
 */

export interface ApprovalItem {
  id: string;
  documentType: string;
  documentId: string;
  documentNumber: string;
  amount: number;
  currency: string;
  baseEquivalent?: number;
  requester: string;
  requesterId?: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  /** For inbox: my approval; for requests: I submitted */
  isMine?: boolean;
}

export const MOCK_APPROVAL_INBOX: ApprovalItem[] = [
  {
    id: "ap1",
    documentType: "invoice",
    documentId: "1",
    documentNumber: "INV-1",
    amount: 125000,
    currency: "KES",
    baseEquivalent: 125000,
    requester: "Jane Doe",
    requestedAt: "2025-01-27T10:00:00Z",
    status: "pending",
    isMine: false,
  },
  {
    id: "ap2",
    documentType: "bill",
    documentId: "1",
    documentNumber: "BILL-1",
    amount: 250000,
    currency: "KES",
    baseEquivalent: 250000,
    requester: "John Smith",
    requestedAt: "2025-01-26T14:00:00Z",
    status: "pending",
    isMine: false,
  },
];

export const MOCK_APPROVAL_REQUESTS: ApprovalItem[] = [
  {
    id: "rq1",
    documentType: "journal",
    documentId: "3",
    documentNumber: "JE-2024-003",
    amount: 15000,
    currency: "KES",
    baseEquivalent: 15000,
    requester: "Me",
    requestedAt: "2025-01-28T09:00:00Z",
    status: "pending",
    isMine: true,
  },
];

export function getMockApprovalInbox(): ApprovalItem[] {
  return [...MOCK_APPROVAL_INBOX];
}

export function getMockApprovalRequests(): ApprovalItem[] {
  return [...MOCK_APPROVAL_REQUESTS];
}
