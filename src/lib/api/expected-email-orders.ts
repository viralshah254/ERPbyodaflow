import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type ExpectedEmailOrderRow = {
  id: string;
  reportedByRole: "merchandiser" | "supervisor" | "sales_rep";
  reportedByName: string;
  reportedByPhone?: string;
  reportedByUserId: string;
  customerType: "modern_trade_branch" | "customer";
  customerName: string;
  branchName?: string;
  odaflowCustomerId?: string;
  odaflowBranchId?: string;
  displayStatus: "EXPECTED" | "SENT" | "OVERDUE" | "RECEIVED" | "CANCELLED";
  expectedBy?: string;
  sentAt?: string;
  notes?: string;
  linkedSalesOrderId?: string;
  createdAt?: string;
};

export type ExpectedEmailOrderSummary = {
  overdueCount: number;
  pendingCount: number;
};

export async function fetchExpectedEmailOrdersApi(filters?: {
  status?: string;
  odaflowBranchId?: string;
  overdueOnly?: boolean;
  unlinkedOnly?: boolean;
}): Promise<ExpectedEmailOrderRow[]> {
  requireLiveApi("Expected email orders");
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.odaflowBranchId) params.odaflowBranchId = filters.odaflowBranchId;
  if (filters?.overdueOnly) params.overdueOnly = "true";
  if (filters?.unlinkedOnly) params.unlinkedOnly = "true";
  const payload = await apiRequest<{ items: ExpectedEmailOrderRow[] }>("/api/expected-email-orders", {
    params,
  });
  return payload.items ?? [];
}

export async function fetchExpectedEmailOrdersSummaryApi(): Promise<ExpectedEmailOrderSummary> {
  requireLiveApi("Expected email orders summary");
  return apiRequest<ExpectedEmailOrderSummary>("/api/expected-email-orders/summary");
}

export async function linkExpectedEmailOrderApi(
  id: string,
  salesOrderId: string
): Promise<{ item: ExpectedEmailOrderRow; salesOrderNumber?: string }> {
  requireLiveApi("Link expected email order");
  return apiRequest<{ item: ExpectedEmailOrderRow; salesOrderNumber?: string }>(
    `/api/expected-email-orders/${id}/link`,
    {
      method: "POST",
      body: { salesOrderId },
    }
  );
}

export async function fetchSuggestedOrdersForExpectedApi(
  id: string
): Promise<
  Array<{
    id: string;
    number?: string;
    partyName?: string;
    purchaseOrderNumber?: string;
    createdAt?: string;
  }>
> {
  requireLiveApi("Suggested orders");
  const payload = await apiRequest<{
    items: Array<{
      id: string;
      number?: string;
      partyName?: string;
      purchaseOrderNumber?: string;
      createdAt?: string;
    }>;
  }>(`/api/expected-email-orders/${id}/suggested-orders`);
  return payload.items ?? [];
}
