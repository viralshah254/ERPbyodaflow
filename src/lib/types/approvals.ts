export type ApprovalItem = {
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
  comment?: string;
  creditBreachReason?: string;
  status: "pending" | "approved" | "rejected";
  isMine?: boolean;
};
