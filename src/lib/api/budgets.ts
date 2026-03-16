import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type BudgetLineRow = {
  accountCode: string;
  period: string;
  amount: number;
  actualAmount?: number;
};

export type BudgetRow = {
  id: string;
  name: string;
  fiscalYear: string;
  costCenter?: string;
  branchId?: string;
  currency: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  lineCount: number;
  totalBudget: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchBudgetsApi(): Promise<BudgetRow[]> {
  requireLiveApi("Budgets");
  const payload = await apiRequest<{ items: BudgetRow[] }>("/api/finance/budgets");
  return payload.items ?? [];
}

export async function createBudgetApi(payload: {
  name: string;
  fiscalYear: string;
  costCenter?: string;
  branchId?: string;
  currency?: string;
  lines: BudgetLineRow[];
}): Promise<{ id: string }> {
  requireLiveApi("Create budget");
  return apiRequest<{ id: string }>("/api/finance/budgets", {
    method: "POST",
    body: payload,
  });
}

export async function updateBudgetApi(
  id: string,
  payload: Partial<{
    name: string;
    fiscalYear: string;
    costCenter: string;
    branchId: string;
    currency: string;
    lines: BudgetLineRow[];
  }>
): Promise<void> {
  requireLiveApi("Update budget");
  await apiRequest(`/api/finance/budgets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function submitBudgetApi(id: string): Promise<void> {
  requireLiveApi("Submit budget");
  await apiRequest(`/api/finance/budgets/${encodeURIComponent(id)}/submit`, {
    method: "POST",
  });
}

export async function approveBudgetApi(id: string): Promise<void> {
  requireLiveApi("Approve budget");
  await apiRequest(`/api/finance/budgets/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
}

export async function fetchBudgetVarianceApi(id: string): Promise<{
  id: string;
  name: string;
  status: string;
  totals: { budgetAmount: number; actualAmount: number; variance: number };
  lines: Array<{ accountCode: string; period: string; budgetAmount: number; actualAmount: number; variance: number }>;
}> {
  requireLiveApi("Budget variance");
  return apiRequest(`/api/finance/budgets/${encodeURIComponent(id)}/variance`);
}
