import { type ApprovalItem, MOCK_APPROVAL_INBOX, MOCK_APPROVAL_REQUESTS } from "@/lib/mock/approvals";
import { loadStoredValue, saveStoredValue, updateStoredCollection } from "@/lib/data/persisted-store";

const INBOX_KEY = "odaflow_approvals_inbox";
const REQUESTS_KEY = "odaflow_approvals_requests";

function seedInbox(): ApprovalItem[] {
  return MOCK_APPROVAL_INBOX.map((item) => ({ ...item }));
}

function seedRequests(): ApprovalItem[] {
  return MOCK_APPROVAL_REQUESTS.map((item) => ({ ...item }));
}

export function listApprovalInbox(): ApprovalItem[] {
  return loadStoredValue(INBOX_KEY, seedInbox).map((item) => ({ ...item }));
}

export function listApprovalRequests(): ApprovalItem[] {
  return loadStoredValue(REQUESTS_KEY, seedRequests).map((item) => ({ ...item }));
}

export function createApprovalRequest(item: Omit<ApprovalItem, "id" | "requestedAt" | "status">): ApprovalItem {
  const created: ApprovalItem = {
    ...item,
    id: `apr-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  saveStoredValue(INBOX_KEY, [created, ...listApprovalInbox()]);
  saveStoredValue(REQUESTS_KEY, [created, ...listApprovalRequests()]);
  return created;
}

export function updateApprovalStatus(id: string, status: ApprovalItem["status"]): void {
  updateStoredCollection(INBOX_KEY, seedInbox, id, (item) => ({ ...item, status }));
  updateStoredCollection(REQUESTS_KEY, seedRequests, id, (item) => ({ ...item, status }));
}

export function replaceApprovalDocumentReference(
  documentType: string,
  documentId: string,
  patch: Partial<ApprovalItem>
): void {
  const applyPatch = (items: ApprovalItem[]) =>
    items.map((item) =>
      item.documentType === documentType && item.documentId === documentId
        ? { ...item, ...patch }
        : item
    );
  saveStoredValue(INBOX_KEY, applyPatch(listApprovalInbox()));
  saveStoredValue(REQUESTS_KEY, applyPatch(listApprovalRequests()));
}

