import { apiRequest, downloadTextFile, isApiConfigured } from "@/lib/api/client";
import type { PurchasingDocRow } from "@/lib/mock/purchasing";
import {
  type PurchaseOrderDetailRow,
  getPurchaseOrderById,
  listPurchaseOrders,
  updatePurchaseOrderStatuses,
} from "@/lib/data/purchasing.repo";

export async function fetchPurchaseOrders(): Promise<PurchasingDocRow[]> {
  if (!isApiConfigured()) {
    return listPurchaseOrders().map(({ supplier, currency, fxRate, country, region, cashMode, lines, ...row }) => row);
  }
  const res = await apiRequest<{ items: PurchasingDocRow[] }>("/api/purchasing/orders");
  return res.items ?? [];
}

export async function fetchPurchaseOrderById(id: string): Promise<PurchaseOrderDetailRow | null> {
  if (!isApiConfigured()) return getPurchaseOrderById(id);
  return apiRequest<PurchaseOrderDetailRow>(`/api/purchasing/orders/${encodeURIComponent(id)}`);
}

export async function approvePurchaseOrders(ids: string[]): Promise<void> {
  if (!isApiConfigured()) {
    updatePurchaseOrderStatuses(ids, "APPROVED");
    return;
  }
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

