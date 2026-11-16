import { apiRequest } from "@/lib/api/client";
import type { IncotexSignableDocType, KraSigningRecord } from "@/lib/kra/kra-signing";

export type IncotexMonitorRow = {
  id: string;
  typeKey: IncotexSignableDocType;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  documentStatus: string;
  customerPinOnFile?: boolean;
  customerPinMissingAt?: string;
  kraSigning: KraSigningRecord | null;
};

export type IncotexMonitorStatusFilter = "all" | "not_sent" | KraSigningRecord["status"];

export type CustomerPinFilter = "all" | "present" | "missing" | "recorded";

export async function fetchIncotexMonitorApi(opts?: {
  status?: IncotexMonitorStatusFilter;
  typeKey?: IncotexSignableDocType | "all";
  provider?: "all" | "incotex" | "etims_oscu";
  customerPin?: CustomerPinFilter;
  limit?: number;
  offset?: number;
}): Promise<{ items: IncotexMonitorRow[]; total: number; customerPinEnabled?: boolean }> {
  const params = new URLSearchParams();
  if (opts?.status && opts.status !== "all") params.set("status", opts.status);
  if (opts?.typeKey && opts.typeKey !== "all") params.set("typeKey", opts.typeKey);
  if (opts?.provider && opts.provider !== "all") params.set("provider", opts.provider);
  if (opts?.customerPin && opts.customerPin !== "all") params.set("customerPin", opts.customerPin);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  return apiRequest<{ items: IncotexMonitorRow[]; total: number; customerPinEnabled?: boolean }>("/api/kra/incotex/monitor", {
    params,
  });
}

export async function retryIncotexDocumentApi(
  typeKey: IncotexSignableDocType,
  documentId: string
): Promise<{ kraSigning: KraSigningRecord }> {
  return apiRequest<{ kraSigning: KraSigningRecord }>(
    `/api/kra/incotex/retry/${encodeURIComponent(typeKey)}/${encodeURIComponent(documentId)}`,
    { method: "POST" }
  );
}

export async function retryIncotexQueueApi(): Promise<{ retried: number }> {
  return apiRequest<{ retried: number }>("/api/kra/incotex/retry-queue", { method: "POST" });
}
