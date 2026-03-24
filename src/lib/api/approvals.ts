import type { ApprovalItem } from "@/lib/types/approvals";
import { apiRequest, requireLiveApi } from "./client";

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
  const creditBreachReason =
    item.comment && item.comment.toLowerCase().includes("credit policy breach")
      ? item.comment
      : undefined;
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
    comment: item.comment,
    creditBreachReason,
    status: mapStatus(item.status),
    isMine,
  };
}

export async function fetchApprovalInbox(): Promise<ApprovalItem[]> {
  requireLiveApi("Approval inbox");
  const data = await apiRequest<{ items: BackendApprovalItem[] }>("/api/approvals/inbox");
  return data.items.map((item) => mapApprovalItem(item));
}

export async function fetchApprovalRequests(): Promise<ApprovalItem[]> {
  requireLiveApi("Approval requests");
  const data = await apiRequest<{ items: BackendApprovalItem[] }>("/api/approvals/requests");
  return data.items.map((item) => mapApprovalItem(item, true));
}

export async function approveApprovalApi(id: string, comment?: string): Promise<void> {
  requireLiveApi("Approve workflow item");
  await apiRequest(`/api/approvals/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function rejectApprovalApi(id: string, comment?: string): Promise<void> {
  requireLiveApi("Reject workflow item");
  await apiRequest(`/api/approvals/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function fetchApprovalById(id: string): Promise<ApprovalItem> {
  requireLiveApi("Fetch approval by ID");
  const item = await apiRequest<BackendApprovalItem>(`/api/approvals/${encodeURIComponent(id)}`);
  return mapApprovalItem(item);
}
