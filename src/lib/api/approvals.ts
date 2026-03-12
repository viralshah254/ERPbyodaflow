import type { ApprovalItem } from "@/lib/mock/approvals";
import { listApprovalInbox, listApprovalRequests } from "@/lib/data/approvals.repo";
import { apiRequest, isApiConfigured } from "./client";

type BackendApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type BackendApprovalItem = {
  id: string;
  documentType: string;
  documentId: string;
  documentNumber: string;
  amount?: number;
  requesterId?: string;
  requesterName?: string;
  requestedAt: string;
  status: BackendApprovalStatus;
  comment?: string;
};

function mapStatus(status: BackendApprovalStatus): ApprovalItem["status"] {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function mapApprovalItem(item: BackendApprovalItem, isMine = false): ApprovalItem {
  return {
    id: item.id,
    documentType: item.documentType,
    documentId: item.documentId,
    documentNumber: item.documentNumber,
    amount: item.amount ?? 0,
    currency: "KES",
    requester: item.requesterName ?? item.requesterId ?? "Unknown user",
    requesterId: item.requesterId,
    requestedAt: item.requestedAt,
    status: mapStatus(item.status),
    isMine,
  };
}

export async function fetchApprovalInbox(): Promise<ApprovalItem[]> {
  if (!isApiConfigured()) {
    return listApprovalInbox().filter((item) => item.status === "pending");
  }
  const data = await apiRequest<{ items: BackendApprovalItem[] }>("/api/approvals/inbox");
  return data.items.map((item) => mapApprovalItem(item));
}

export async function fetchApprovalRequests(): Promise<ApprovalItem[]> {
  if (!isApiConfigured()) {
    return listApprovalRequests();
  }
  const data = await apiRequest<{ items: BackendApprovalItem[] }>("/api/approvals/requests");
  return data.items.map((item) => mapApprovalItem(item, true));
}
