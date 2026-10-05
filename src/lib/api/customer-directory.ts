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
