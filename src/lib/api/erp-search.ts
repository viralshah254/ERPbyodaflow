import { apiRequest, isApiConfigured } from "./client";

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

export async function searchErpApi(query: string): Promise<ErpSearchResponse> {
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
  if (!isApiConfigured()) {
    return {
      query: normalized,
      summary: `Search preview for "${normalized}" requires the backend connection.`,
      topIntent: "search",
      hits: [],
      suggestions: ["Connect the backend to resolve customers, products, invoices, and stock."],
    };
  }
  return apiRequest<ErpSearchResponse>("/api/search/resolve", {
    method: "POST",
    body: { query: normalized },
  });
}
