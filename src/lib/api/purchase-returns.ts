import { apiRequest, downloadFile, isApiConfigured } from "@/lib/api/client";

export type PurchaseReturnRow = {
  id: string;
  number: string;
  date: string;
  status: string;
  supplierId?: string;
  supplierName?: string;
  party?: string;
  grnRef?: string;
  warehouseId?: string;
  total?: number;
};

export async function fetchPurchaseReturns(status?: string): Promise<PurchaseReturnRow[]> {
  if (!isApiConfigured()) return [];
  const payload = await apiRequest<{ items: PurchaseReturnRow[] }>("/api/purchasing/purchase-returns", {
    params: status ? { status } : undefined,
  });
  return payload.items ?? [];
}

export async function createPurchaseReturnApi(): Promise<{ id: string; number: string }> {
  return apiRequest("/api/purchasing/purchase-returns", {
    method: "POST",
    body: { lines: [] },
  });
}

export async function approvePurchaseReturnApi(id: string): Promise<void> {
  await apiRequest(`/api/purchasing/purchase-returns/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
}

export function exportPurchaseReturnsApi(onError: (message: string) => void): void {
  if (!isApiConfigured()) {
    onError("API not configured.");
    return;
  }
  void downloadFile("/api/purchasing/purchase-returns/export?format=csv", "purchase-returns.csv", onError);
}
