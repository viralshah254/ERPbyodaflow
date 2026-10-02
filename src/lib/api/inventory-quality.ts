import { apiRequest } from "./client";

export type InventoryQualityCase = {
  _id: string;
  kind: "QUALITY" | "LOSS" | "RECALL";
  status: "OPEN" | "CONTAINED" | "CLOSED";
  lotId: string;
  documentIds: string[];
  affectedQuantity: number;
  reason: string;
  capa?: string;
};

export async function fetchInventoryQualityCasesApi() {
  const result = await apiRequest<{ items: InventoryQualityCase[] }>("/api/inventory/quality-cases");
  return result.items ?? [];
}

export async function createInventoryQualityCaseApi(body: {
  kind: "QUALITY" | "LOSS" | "RECALL";
  lotId: string;
  affectedQuantity: number;
  reason: string;
  capa?: string;
}) {
  return apiRequest<{ id: string; linkedDocumentCount: number }>("/api/inventory/quality-cases", {
    method: "POST",
    body,
  });
}

export async function actionInventoryQualityCaseApi(id: string, action: "post-loss" | "close", capa?: string) {
  return apiRequest(`/api/inventory/quality-cases/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: { action, capa },
  });
}
