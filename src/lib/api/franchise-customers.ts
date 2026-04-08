import { apiRequest, requireLiveApi } from "./client";

export type NetworkCustomerOutlet = {
  orgId: string;
  partyId: string;
  name: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
};

export type NetworkCustomerRow = {
  networkCustomerId: string;
  name: string;
  phone?: string;
  email?: string;
  customerType?: string;
  outlets: NetworkCustomerOutlet[];
  outletCount: number;
  totalSpend: number;
  orderCount: number;
  lastPurchase: string | null;
};

export type NetworkCustomerListResponse = {
  items: NetworkCustomerRow[];
  total: number;
  limit: number;
  cursor: string | null;
};

export type NetworkCustomerOutletBreakdown = {
  orgId: string;
  outletName: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
  partyId: string;
  partyCode?: string;
  customerType?: string;
  creditLimitAmount?: number;
  totalSpend: number;
  orderCount: number;
  lastPurchase: string | null;
};

export type TopProduct = {
  productId: string;
  name: string;
  code?: string;
  totalQty: number;
  totalAmount: number;
  orderCount: number;
};

export type RecentOrder = {
  id: string;
  number: string;
  date: string;
  status: string;
  orgId: string;
  outletName: string;
  totalAmount: number;
  currency?: string;
};

export type NetworkCustomer360 = {
  networkCustomerId: string;
  name: string;
  phone?: string;
  email?: string;
  customerType?: string;
  outletAccounts: NetworkCustomerOutletBreakdown[];
  totalSpend: number;
  totalOrders: number;
  lastPurchase: string | null;
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
};

export async function fetchNetworkCustomersApi(params?: {
  search?: string;
  outlet?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}): Promise<NetworkCustomerListResponse> {
  requireLiveApi("Network customers");
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.outlet) query.set("outlet", params.outlet);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  return apiRequest<NetworkCustomerListResponse>("/api/franchise/network-customers", { params: query });
}

export async function fetchNetworkCustomer360Api(networkCustomerId: string): Promise<NetworkCustomer360> {
  requireLiveApi("Network customer 360");
  return apiRequest<NetworkCustomer360>(`/api/franchise/network-customers/${encodeURIComponent(networkCustomerId)}`);
}
