import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { PurchasingDocRow } from "@/lib/mock/purchasing";

type BackendPurchaseRequest = {
  id: string;
  number: string;
  date?: string;
  partyId?: string;
  total?: number;
  status?: string;
};

export async function fetchPurchaseRequestsApi(): Promise<PurchasingDocRow[]> {
  requireLiveApi("Purchase requests");
  const payload = await apiRequest<{ items: BackendPurchaseRequest[] }>("/api/purchasing/requests");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.partyId ?? "Requester pending",
    total: item.total ?? 0,
    status: (item.status as PurchasingDocRow["status"]) ?? "DRAFT",
  }));
}
