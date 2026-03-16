import { apiRequest, requireLiveApi } from "@/lib/api/client";

export async function fetchDocumentDraftApi(type: string): Promise<Record<string, unknown> | null> {
  requireLiveApi("Document draft");
  const payload = await apiRequest<{ draft: { payload: Record<string, unknown> } | null }>(
    `/api/documents/drafts/${encodeURIComponent(type)}`
  );
  return payload.draft?.payload ?? null;
}

export async function saveDocumentDraftApi(type: string, payload: Record<string, unknown>): Promise<void> {
  requireLiveApi("Save document draft");
  await apiRequest(`/api/documents/drafts/${encodeURIComponent(type)}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteDocumentDraftApi(type: string): Promise<void> {
  requireLiveApi("Delete document draft");
  await apiRequest(`/api/documents/drafts/${encodeURIComponent(type)}`, {
    method: "DELETE",
  });
}
