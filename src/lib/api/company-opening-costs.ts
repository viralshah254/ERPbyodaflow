import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type OpeningCostRow = {
  productId: string;
  code: string;
  sku: string;
  name: string;
  onHand: number;
  unitCost: number | null;
  currency: string;
  missing: boolean;
  evidence: string;
};

export type OpeningCostPage = {
  method: string;
  applies: boolean;
  rows: OpeningCostRow[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export async function fetchCompanyOpeningCosts(params: {
  limit: number;
  offset: number;
  search?: string;
  products?: string;
}): Promise<OpeningCostPage> {
  requireLiveApi("Company opening costs");
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit));
  qs.set("offset", String(params.offset));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.products?.trim()) qs.set("products", params.products.trim());
  return apiRequest<OpeningCostPage>("/api/inventory/company-opening-costs", { params: qs });
}

export async function saveCompanyOpeningCost(input: {
  productId: string;
  unitCost: number;
}): Promise<OpeningCostRow> {
  requireLiveApi("Company opening costs");
  return apiRequest<OpeningCostRow>("/api/inventory/company-opening-costs", { method: "POST", body: input });
}
