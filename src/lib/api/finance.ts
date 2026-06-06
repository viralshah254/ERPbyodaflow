import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type FinanceOverview = {
  summary: {
    cashBalance: number;
    bankAccountCount: number;
    arOutstanding: number;
    apOutstanding: number;
    postedJournalCount: number;
    netRevenue: number;
  };
  arOutstandingItems: Array<{
    id: string;
    number: string;
    outstanding: number;
    outstandingKes?: number;
    currency?: string;
    exchangeRate?: number;
    dueDate?: string;
  }>;
  apOutstandingItems: Array<{
    id: string;
    number: string;
    outstanding: number;
    outstandingKes?: number;
    currency?: string;
    exchangeRate?: number;
    dueDate?: string;
  }>;
  recentJournals: Array<{
    id: string;
    number: string;
    date: string;
    reference?: string;
    total: number;
    status: string;
  }>;
};

export type FinancePeriod = {
  id: string;
  fiscalYear: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
};

export type FinanceStatementAccountLine = {
  accountId: string;
  code: string;
  name: string;
  /** Normalized net amount in the natural direction for the account type. */
  amount: number;
};

export type FinanceStatementSection = {
  key: string;
  label: string;
  amount: number;
  /** Per-account breakdown within this section (empty for computed totals like net-income). */
  lines: FinanceStatementAccountLine[];
};

export type FinanceStatement = {
  type: "pnl" | "balance-sheet" | "cash-flow";
  periodId?: string | null;
  sections: FinanceStatementSection[];
  /** Methodological notes for display in statement footer. */
  notes?: string[];
  summary: Record<string, number | boolean>;
};

export type FinanceStatementDrilldownItem = {
  postingLineId: string;
  postingDate: string;
  sourceType: string;
  sourceId: string;
  sourceNumber: string;
  documentNumber?: string;
  ledgerAccountId?: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  amount: number;
  reference?: string;
};

export type LedgerEntry = {
  date: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  documentId: string;
  documentNumber: string;
  sourceType: string;
  sourceId: string;
};

export type PostingBatchSummary = {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceNumber?: string;
  postingDate: string;
  currency: string;
  reference?: string;
  journalDocumentId?: string;
  reversalOfBatchId?: string;
  reversedByBatchId?: string;
  createdBy?: string;
};

export type PostingBatchDetail = PostingBatchSummary & {
  lines: Array<{
    id: string;
    ledgerAccountId: string;
    accountCode?: string;
    accountName?: string;
    accountType?: string;
    description?: string;
    debit: number;
    credit: number;
    partyId?: string;
    documentId?: string;
    paymentId?: string;
  }>;
  totals: {
    debit: number;
    credit: number;
  };
};

export type FinanceAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency?: string;
  parentId?: string;
  description?: string;
};

export type PostingMappingKey =
  | "accountsReceivableAccountId"
  | "salesRevenueAccountId"
  | "accountsPayableAccountId"
  | "purchaseExpenseAccountId"
  | "inventoryAccountId"
  | "goodsReceivedNotInvoicedAccountId"
  | "bankClearingAccountId";

export type PostingMappingRow = {
  key: PostingMappingKey;
  label: string;
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  fallback: {
    code: string;
    name: string;
    type: string;
  };
};

export async function fetchFinanceOverviewApi(): Promise<FinanceOverview> {
  requireLiveApi("Finance overview");
  return apiRequest<FinanceOverview>("/api/finance/overview");
}

export async function fetchFinancePeriodsApi(): Promise<FinancePeriod[]> {
  requireLiveApi("Finance periods");
  const payload = await apiRequest<{ periods: FinancePeriod[] }>("/api/finance/period-close");
  return payload.periods;
}

/** Map failures from GET /finance/period-close into copy for Financial Statements UI. */
export function formatFinancePeriodLoadError(error: unknown): string {
  const apiErr = error as Error & { status?: number };
  if (apiErr.status === 403) {
    return "You don't have permission to load fiscal periods. Ask an administrator for finance.read, Period Close access, or confirm your role can list periods for statements.";
  }
  return apiErr.message || "Failed to load fiscal periods.";
}

export type CloseChecklistItem = {
  key: string;
  label: string;
  count: number;
  severity: "error" | "warning";
  action: string;
};

export type CloseChecklist = {
  periodId: string | null;
  periodLabel: string;
  items: CloseChecklistItem[];
};

export async function fetchCloseChecklistApi(periodId?: string): Promise<CloseChecklist> {
  requireLiveApi("Close checklist");
  const params = new URLSearchParams();
  if (periodId) params.set("periodId", periodId);
  return apiRequest<CloseChecklist>("/api/finance/close-checklist", { params });
}

export async function closeFinancePeriodApi(periodId: string): Promise<void> {
  requireLiveApi("Close finance period");
  await apiRequest("/api/finance/period-close", {
    method: "POST",
    body: { periodId },
  });
}

export async function reopenFinancePeriodApi(periodId: string): Promise<void> {
  requireLiveApi("Reopen finance period");
  await apiRequest("/api/finance/period-reopen", {
    method: "POST",
    body: { periodId },
  });
}

/** Create one posting period (typically used when seeding monthly periods for a FY). Requires finance.close.write. */
export async function createFinancePeriodApi(payload: {
  fiscalYear: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create finance period");
  return apiRequest<{ id: string }>("/api/finance/periods", {
    method: "POST",
    body: payload,
  });
}

export async function fetchFinancialStatementApi(
  type: "pnl" | "balance-sheet" | "cash-flow",
  periodId?: string
): Promise<FinanceStatement> {
  requireLiveApi("Financial statements");
  const params = new URLSearchParams();
  if (periodId) params.set("periodId", periodId);
  return apiRequest<FinanceStatement>(`/api/finance/statements/${type}`, { params });
}

export async function fetchFinancialStatementDrilldownApi(
  type: "pnl" | "balance-sheet" | "cash-flow",
  sectionKey: string,
  periodId?: string,
  accountId?: string
): Promise<FinanceStatementDrilldownItem[]> {
  requireLiveApi("Financial statement drilldown");
  const params = new URLSearchParams();
  if (periodId) params.set("periodId", periodId);
  if (accountId) params.set("accountId", accountId);
  const payload = await apiRequest<{ items: FinanceStatementDrilldownItem[] }>(
    `/api/finance/statements/${encodeURIComponent(type)}/drilldown/${encodeURIComponent(sectionKey)}`,
    { params }
  );
  return payload.items ?? [];
}

export type LedgerPageResult = {
  entries: LedgerEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export async function fetchLedgerEntriesPageApi(params?: {
  accountId?: string;
  periodId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}): Promise<LedgerPageResult> {
  requireLiveApi("Ledger entries");
  const lim = params?.limit != null ? Math.min(Math.max(params.limit, 1), 100) : 25;
  const qs = new URLSearchParams();
  qs.set("limit", String(lim));
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.accountId) qs.set("accountId", params.accountId);
  if (params?.periodId) qs.set("periodId", params.periodId);
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  const payload = await apiRequest<{
    entries: LedgerEntry[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/finance/ledger", { params: qs });
  const entries = payload.entries ?? [];
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const offset =
    typeof payload.offset === "number" ? payload.offset : params?.cursor ? Number(params.cursor) || 0 : 0;
  const total = typeof payload.total === "number" ? payload.total : entries.length;
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : offset + entries.length < total;
  return {
    entries,
    total,
    limit,
    offset,
    hasMore,
    nextCursor: payload.nextCursor ?? (hasMore ? String(offset + entries.length) : null),
  };
}

export async function fetchLedgerEntriesApi(accountId?: string, periodId?: string): Promise<LedgerEntry[]> {
  requireLiveApi("Ledger entries");
  const params = new URLSearchParams();
  if (accountId) params.set("accountId", accountId);
  if (periodId) params.set("periodId", periodId);
  params.set("limit", "5000");
  const payload = await apiRequest<{ entries: LedgerEntry[] }>("/api/finance/ledger", { params });
  return payload.entries ?? [];
}

export async function fetchPostingBatchesApi(sourceType?: string, sourceId?: string): Promise<PostingBatchSummary[]> {
  requireLiveApi("Posting batches");
  const params = new URLSearchParams();
  if (sourceType) params.set("sourceType", sourceType);
  if (sourceId) params.set("sourceId", sourceId);
  const payload = await apiRequest<{ items: PostingBatchSummary[] }>("/api/finance/posting-batches", { params });
  return payload.items ?? [];
}

export async function fetchPostingBatchDetailApi(batchId: string): Promise<PostingBatchDetail> {
  return apiRequest<PostingBatchDetail>(`/api/finance/posting-batches/${encodeURIComponent(batchId)}`);
}

export async function fetchPostingBatchBySourceApi(sourceType: string, sourceId: string): Promise<PostingBatchSummary | null> {
  const payload = await apiRequest<{ items: PostingBatchSummary[] }>(
    `/api/finance/posting-batches/source/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}`
  );
  return payload.items?.[0] ?? null;
}

export async function fetchFinanceAccountsApi(): Promise<FinanceAccount[]> {
  requireLiveApi("Finance accounts");
  const payload = await apiRequest<{ items: FinanceAccount[] }>("/api/finance/accounts");
  return payload.items ?? [];
}

/** Next unused numeric-style code from the server (for new ledger accounts). */
export async function fetchSuggestedFinanceAccountCodeApi(): Promise<{ code: string }> {
  requireLiveApi("Suggested ledger account code");
  return apiRequest<{ code: string }>("/api/finance/accounts/suggested-code");
}

export async function createFinanceAccountApi(payload: {
  code?: string;
  name: string;
  type: string;
  parentId?: string;
  currency?: string;
  description?: string;
}): Promise<{ id: string; code: string }> {
  requireLiveApi("Finance account creation");
  return apiRequest<{ id: string; code: string }>("/api/finance/accounts", {
    method: "POST",
    body: payload,
  });
}

export async function updateFinanceAccountApi(
  id: string,
  payload: { code?: string; name?: string; type?: string; parentId?: string; currency?: string; description?: string }
): Promise<void> {
  requireLiveApi("Finance account update");
  await apiRequest(`/api/master-data/finance/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteFinanceAccountApi(id: string): Promise<void> {
  requireLiveApi("Finance account delete");
  await apiRequest(`/api/master-data/finance/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchPostingMappingsApi(): Promise<{
  items: PostingMappingRow[];
  accounts: FinanceAccount[];
}> {
  requireLiveApi("Posting mappings");
  return apiRequest<{ items: PostingMappingRow[]; accounts: FinanceAccount[] }>(
    "/api/settings/financial/posting-mappings"
  );
}

export async function savePostingMappingsApi(
  mappings: Partial<Record<PostingMappingKey, string | null>>
): Promise<void> {
  requireLiveApi("Save posting mappings");
  await apiRequest("/api/settings/financial/posting-mappings", {
    method: "PATCH",
    body: mappings,
  });
}

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};

export type TrialBalance = {
  periodId: string | null;
  periodLabel: string;
  rows: TrialBalanceRow[];
  totals: { debit: number; credit: number; isBalanced: boolean };
};

export async function fetchTrialBalanceApi(periodId?: string): Promise<TrialBalance> {
  requireLiveApi("Trial balance");
  const params = new URLSearchParams();
  if (periodId) params.set("periodId", periodId);
  return apiRequest<TrialBalance>("/api/finance/trial-balance", { params });
}
