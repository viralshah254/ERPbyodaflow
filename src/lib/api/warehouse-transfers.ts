/**
 * Warehouse transfers API — inter-warehouse stock transfers.
 * Uses backend when NEXT_PUBLIC_API_URL is set, otherwise falls back to mocks.
 */

import { apiRequest, downloadTextFile, isApiConfigured } from "@/lib/api/client";
import {
  createTransferRecord,
  getTransferById,
  listTransfers,
  updateTransferRecordStatus,
} from "@/lib/data/transfers.repo";
import { type TransferRow } from "@/lib/mock/warehouse/transfers";
import type { TransferStatus } from "@/lib/mock/warehouse/transfers";

export type { TransferRow, TransferStatus };

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

export async function fetchTransfers(params?: { status?: string; search?: string }): Promise<TransferRow[]> {
  if (!isApiConfigured()) {
    // Filter mocks client-side for dev/demo
    let items = listTransfers();
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.fromWarehouse.toLowerCase().includes(q) ||
          r.toWarehouse.toLowerCase().includes(q)
      );
    }
    if (params?.status) items = items.filter((r) => r.status === params.status);
    return items;
  }
  const res = await apiRequest<{ items: TransferRow[] }>("/api/warehouse/transfers", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchTransferById(id: string): Promise<TransferRow | null> {
  if (!isApiConfigured()) {
    return getTransferById(id);
  }
  try {
    return await apiRequest<TransferRow>(`/api/warehouse/transfers/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createTransfer(body: {
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  reference?: string;
  lines: { sku: string; productName?: string; quantity: number; unit?: string }[];
}): Promise<{ id: string }> {
  if (!isApiConfigured()) {
    const created = createTransferRecord(body);
    return { id: created.id };
  }
  return apiRequest<{ id: string }>("/api/warehouse/transfers", {
    method: "POST",
    body,
  });
}

export async function updateTransferStatus(
  id: string,
  status: TransferStatus
): Promise<void> {
  if (!isApiConfigured()) {
    updateTransferRecordStatus(id, status);
    return;
  }
  await apiRequest(`/api/warehouse/transfers/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: { action: status.toLowerCase() },
  });
}

export function exportTransfersCsv(rows: TransferRow[]): void {
  const headers = ["number", "date", "fromWarehouse", "toWarehouse", "status", "lineCount"];
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.number,
        row.date,
        row.fromWarehouse,
        row.toWarehouse,
        row.status,
        row.lines.length,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");
  downloadTextFile(
    `warehouse-transfers-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
}

