import { apiRequest, requireLiveApi } from "./client";
import type { CopilotContext, CopilotResponse } from "@/types/copilot";

export type ErpSearchHit = {
  id: string;
  entityType:
    | "customer"
    | "supplier"
    | "product"
    | "document"
    | "payment"
    | "warehouse"
    | "stock"
    | "approval"
    | "bank-account";
  title: string;
  subtitle?: string;
  href: string;
  score: number;
  matchedOn: string[];
  relationships?: Array<{
    label: string;
    href: string;
  }>;
  metadata?: Record<string, unknown>;
};

export type ErpSearchResponse = {
  query: string;
  summary: string;
  topIntent: "search" | "document_lookup" | "party_lookup" | "product_lookup" | "inventory_lookup";
  hits: ErpSearchHit[];
  suggestions: string[];
};

export async function searchErpApi(query: string, context?: CopilotContext): Promise<CopilotResponse> {
  const normalized = query.trim();
  if (!normalized) {
    return {
      query: normalized,
      summary: "Enter a query to search ERP records.",
      topIntent: "search",
      hits: [],
      suggestions: [],
    };
  }
  requireLiveApi("ERP search");
  return apiRequest<CopilotResponse>("/api/search/resolve", {
    method: "POST",
    body: { query: normalized, context },
  });
}
