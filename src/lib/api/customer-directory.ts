import { apiRequest, requireLiveApi } from "./client";

export type CustomerDirectorySummary = {
  all: number;
  multichain: number;
  generalTrade: number;
  distributors: number;
  vanSales: number;
};

export async function fetchCustomerDirectorySummaryApi(): Promise<CustomerDirectorySummary> {
  requireLiveApi("Customer directory");
  return apiRequest<CustomerDirectorySummary>("/api/parties/customer-directory-summary");
}

/** Canonical AR balance chips for one directory page, separated by currency. */
export async function fetchCustomerBalancesApi(ids: string[]): Promise<Record<string, Array<{ currency: string; amount: number }>>> {
  requireLiveApi("Customer balances");
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  if (unique.length > 100) throw new Error("At most 100 customers are allowed.");
  const data = await apiRequest<{ byParty: Record<string, Array<{ currency: string; amount: number }>> }>("/api/parties/outstanding-batch", { params: { ids: unique.join(",") } });
  return data.byParty;
}
