/**
 * Warehouse transfers API — inter-warehouse stock transfers.
 * Uses backend when NEXT_PUBLIC_API_URL is set, otherwise falls back to mocks.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { getMockTransfers, type TransferRow } from "@/lib/mock/warehouse/transfers";

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

export async function fetchTransfers(params?: { status?: string; search?: string }): Promise<TransferRow[]> {
  if (!isApiConfigured()) {
    // Filter mocks client-side for dev/demo
    let items = getMockTransfers();
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
    return getMockTransfers().find((t) => t.id === id) ?? null;
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
  if (!isApiConfigured()) throw new Error("STUB");
  return apiRequest<{ id: string }>("/api/warehouse/transfers", {
    method: "POST",
    body,
  });
}

