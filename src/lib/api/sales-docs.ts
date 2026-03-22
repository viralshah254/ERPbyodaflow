import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { SalesDocRow } from "@/lib/types/sales";

type BackendSalesDoc = {
  id: string;
  number: string;
  date: string;
  party?: string;
  partyId?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status?: string;
};

type SalesDocType = "quote" | "sales-order" | "delivery-note" | "invoice";

function mapSalesDoc(item: BackendSalesDoc): SalesDocRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.party ?? item.partyId,
    partyId: item.partyId,
    total: item.total ?? 0,
    currency: item.currency,
    exchangeRate: item.exchangeRate,
    status: item.status ?? "DRAFT",
  };
}

function endpointFor(type: SalesDocType): string {
  if (type === "quote") return "/api/sales/quotes";
  if (type === "sales-order") return "/api/sales/orders";
  if (type === "delivery-note") return "/api/sales/deliveries";
  return "/api/sales/invoices";
}

export async function fetchSalesDocumentsApi(type: SalesDocType): Promise<SalesDocRow[]> {
  requireLiveApi("Sales documents");
  const payload = await apiRequest<{ items: BackendSalesDoc[] }>(endpointFor(type));
  return (payload.items ?? []).map(mapSalesDoc);
}
