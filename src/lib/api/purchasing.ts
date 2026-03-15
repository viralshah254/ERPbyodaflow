import { apiRequest, downloadTextFile, requireLiveApi } from "@/lib/api/client";
import type { PurchasingDocRow } from "@/lib/mock/purchasing";
import { type PurchaseOrderDetailRow } from "@/lib/data/purchasing.repo";

export async function fetchPurchaseOrders(): Promise<PurchasingDocRow[]> {
  requireLiveApi("Purchase orders");
  const res = await apiRequest<{ items: PurchasingDocRow[] }>("/api/purchasing/orders");
  return res.items ?? [];
}

export async function fetchPurchaseOrderById(id: string): Promise<PurchaseOrderDetailRow | null> {
  requireLiveApi("Purchase order detail");
  return apiRequest<PurchaseOrderDetailRow>(`/api/purchasing/orders/${encodeURIComponent(id)}`);
}

export async function approvePurchaseOrders(ids: string[]): Promise<void> {
  requireLiveApi("Approve purchase orders");
  await apiRequest("/api/purchasing/orders/approve-bulk", { method: "POST", body: { ids } });
}

export function exportPurchaseOrdersCsv(rows: PurchasingDocRow[]): void {
  const csv = [
    ["number", "date", "supplier", "total", "status"].join(","),
    ...rows.map((row) =>
      [row.number, row.date, row.party ?? "", row.total ?? "", row.status]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");
  downloadTextFile(`purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}

