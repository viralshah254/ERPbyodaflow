import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { EntityRow, ICTransactionRow } from "@/lib/types/intercompany";

type BackendEntity = {
  id: string;
  code?: string;
  name: string;
};

type BackendTransaction = {
  id: string;
  type?: string;
  number?: string;
  date?: string;
  fromEntityId: string;
  fromEntityName?: string;
  toEntityId: string;
  toEntityName?: string;
  amount: number;
  currency?: string;
  status?: string;
};

export type IntercompanyConsolidationRow = {
  currency: string;
  amount: number;
};

export type CreateIntercompanyTransactionInput = {
  type: "IC_INVOICE" | "IC_BILL";
  number?: string;
  fromEntityId: string;
  toEntityId: string;
  amount: number;
  currency: string;
  date: string;
  reference?: string;
  status?: string;
};

export async function fetchIntercompanyEntitiesApi(): Promise<EntityRow[]> {
  requireLiveApi("Intercompany entities");
  const payload = await apiRequest<{ items: BackendEntity[] }>("/api/intercompany/entities");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    code: item.code ?? item.id.slice(0, 4).toUpperCase(),
    name: item.name,
    baseCurrency: "USD",
    isReporting: false,
  }));
}

export async function fetchIntercompanyTransactionsApi(): Promise<ICTransactionRow[]> {
  requireLiveApi("Intercompany transactions");
  const payload = await apiRequest<{ items: BackendTransaction[] }>("/api/intercompany/transactions");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    type: (item.type as ICTransactionRow["type"]) ?? "IC_INVOICE",
    number: item.number ?? item.id,
    date: item.date?.slice(0, 10) ?? "",
    fromEntityId: item.fromEntityId,
    fromEntityName: item.fromEntityName ?? item.fromEntityId,
    toEntityId: item.toEntityId,
    toEntityName: item.toEntityName ?? item.toEntityId,
    amount: item.amount ?? 0,
    currency: item.currency ?? "USD",
    status: item.status === "POSTED" ? "POSTED" : "DRAFT",
  }));
}

export async function createIntercompanyTransactionApi(payload: CreateIntercompanyTransactionInput): Promise<{ id: string }> {
  requireLiveApi("Create intercompany transaction");
  return apiRequest<{ id: string }>("/api/intercompany/transactions", {
    method: "POST",
    body: payload,
  });
}

export async function fetchIntercompanyConsolidationApi(): Promise<IntercompanyConsolidationRow[]> {
  requireLiveApi("Intercompany consolidation");
  const payload = await apiRequest<{ data: IntercompanyConsolidationRow[] }>("/api/intercompany/consolidation");
  return payload.data ?? [];
}
