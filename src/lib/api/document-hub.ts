import { apiRequest } from "./client";
import type { DocumentHubGroup, DocumentHubList, DocumentLearningRule, ScannedDocument } from "@/lib/types/document-hub";

export function fetchDocumentHub(params?: { status?: string; documentType?: string; party?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.documentType) search.set("documentType", params.documentType);
  if (params?.party) search.set("party", params.party);
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();
  return apiRequest<DocumentHubList>(`/api/document-hub${qs ? `?${qs}` : ""}`);
}

export async function uploadDocumentHubFiles(
  files: File[],
  sourceTransaction?: { docType: string; docId: string }
) {
  const encoded = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      contentBase64: await fileToBase64(file),
    }))
  );
  return apiRequest<{ uploads: Array<{ fileId: string; items: ScannedDocument[] }> }>("/api/document-hub/uploads", {
    method: "POST",
    body: { files: encoded, sourceTransaction },
  });
}

export function deleteHubDocument(id: string) {
  return apiRequest<{ id: string; fileRemoved: boolean }>(`/api/document-hub/${id}`, { method: "DELETE" });
}

export function explainHubDocument(id: string) {
  return apiRequest<{ summary: string; source: "copilot" | "fields" }>(`/api/document-hub/${id}/summary`, { method: "POST" });
}

export function confirmHubClassification(id: string, body: { documentType: string; groupKey: string; fields?: { partyName?: string } }) {
  return apiRequest<ScannedDocument>(`/api/document-hub/${id}/classification`, { method: "POST", body });
}

export function confirmHubPhysicalReceipt(id: string, lines: Array<{ description: string; physicalQuantity: number }>) {
  return apiRequest<ScannedDocument>(`/api/document-hub/${id}/physical-receipt`, { method: "POST", body: { lines } });
}

export function confirmHubAllocation(id: string, lines: Array<{ invoiceId?: string; invoiceNumber: string; amount: number }>) {
  return apiRequest<ScannedDocument>(`/api/document-hub/${id}/allocation`, { method: "POST", body: { lines } });
}

export function linkHubDocument(id: string, docType: string, docId: string) {
  return apiRequest<ScannedDocument>(`/api/document-hub/${id}/link`, { method: "POST", body: { docType, docId } });
}

export function clearHubCheque(id: string, bankReference: string) {
  return apiRequest<ScannedDocument>(`/api/document-hub/${id}/clear-cheque`, { method: "POST", body: { bankReference } });
}

export function createHubGroup(name: string, parentKey?: string) {
  return apiRequest<DocumentHubGroup>("/api/document-hub/groups", { method: "POST", body: { name, parentKey } });
}

export function updateHubRule(id: string, body: { status?: "proposed" | "confirmed"; mode?: "suggest" | "draft" | "auto_post" }) {
  return apiRequest<DocumentLearningRule>(`/api/document-hub/rules/${id}`, { method: "POST", body });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.slice(value.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
