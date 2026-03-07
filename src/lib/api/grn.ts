/**
 * GRN (goods receipt) API — backend when NEXT_PUBLIC_API_URL set, else mocks.
 * See BACKEND_SPEC_COOL_CATCH.md §3.7 (GRN line weight).
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { getMockGRNs, getMockGRNById, type GrnDetailRow } from "@/lib/mock/purchasing";
import type { PurchasingDocRow } from "@/lib/mock/purchasing";

export type { GrnDetailRow };

export async function fetchGRNs(): Promise<PurchasingDocRow[]> {
  if (!isApiConfigured()) return getMockGRNs();
  try {
    const res = await apiRequest<{ items: PurchasingDocRow[] }>("/api/purchasing/grn");
    return res?.items ?? [];
  } catch {
    return [];
  }
}

export async function fetchGRNById(id: string): Promise<GrnDetailRow | null> {
  if (!isApiConfigured()) return getMockGRNById(id);
  try {
    const res = await apiRequest<GrnDetailRow>(`/api/purchasing/grn/${encodeURIComponent(id)}`);
    return res;
  } catch {
    return null;
  }
}
