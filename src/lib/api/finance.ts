import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { listFiscalYears } from "@/lib/data/fiscal.repo";
import { getMockCOARootFirst } from "@/lib/mock/coa";
import { getMockCashflowForecast } from "@/lib/mock/treasury/cashflow";
import { getMockOverdueInvoices } from "@/lib/mock/treasury/collections";

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
    dueDate?: string;
  }>;
  apOutstandingItems: Array<{
    id: string;
    number: string;
    outstanding: number;
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

export type FinanceStatement = {
  type: "pnl" | "balance-sheet" | "cash-flow";
  periodId?: string;
  sections: Array<{ key: string; label: string; amount: number }>;
  summary: Record<string, number>;
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
};

export type FinanceAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
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
  if (!isApiConfigured()) {
    const overdue = getMockOverdueInvoices();
    const cashflow = getMockCashflowForecast();
    return {
      summary: {
        cashBalance: cashflow[cashflow.length - 1]?.balance ?? 0,
        bankAccountCount: 2,
        arOutstanding: overdue.reduce((sum, row) => sum + row.outstanding, 0),
        apOutstanding: 0,
        postedJournalCount: 0,
        netRevenue: overdue.reduce((sum, row) => sum + row.total, 0),
      },
      arOutstandingItems: overdue.map((row) => ({
        id: row.id,
        number: row.number,
        outstanding: row.outstanding,
        dueDate: row.dueDate,
      })),
      apOutstandingItems: [],
      recentJournals: [],
    };
  }
  return apiRequest<FinanceOverview>("/api/finance/overview");
}

export async function fetchFinancePeriodsApi(): Promise<FinancePeriod[]> {
  if (!isApiConfigured()) {
    return listFiscalYears().flatMap((year) =>
      year.periods.map((period) => ({
        id: period.id,
        fiscalYear: year.year,
        periodNumber: period.month,
        startDate: year.startDate,
        endDate: year.endDate,
        status: period.status === "Closed" ? "CLOSED" : "OPEN",
      }))
    );
  }
  const payload = await apiRequest<{ periods: FinancePeriod[] }>("/api/finance/period-close");
  return payload.periods;
}

export async function closeFinancePeriodApi(periodId: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest("/api/finance/period-close", {
    method: "POST",
    body: { periodId },
  });
}

export async function reopenFinancePeriodApi(periodId: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest("/api/finance/period-reopen", {
    method: "POST",
    body: { periodId },
  });
}

export async function fetchFinancialStatementApi(
  type: "pnl" | "balance-sheet" | "cash-flow",
  periodId?: string
): Promise<FinanceStatement> {
  if (!isApiConfigured()) {
    return {
      type,
      periodId,
      sections: [],
      summary: {},
    };
  }
  const params = new URLSearchParams();
  if (periodId) params.set("periodId", periodId);
  return apiRequest<FinanceStatement>(`/api/finance/statements/${type}`, { params });
}

export async function fetchLedgerEntriesApi(accountId?: string, periodId?: string): Promise<LedgerEntry[]> {
  if (!isApiConfigured()) return [];
  const params = new URLSearchParams();
  if (accountId) params.set("accountId", accountId);
  if (periodId) params.set("periodId", periodId);
  const payload = await apiRequest<{ entries: LedgerEntry[] }>("/api/finance/ledger", { params });
  return payload.entries ?? [];
}

export async function fetchFinanceAccountsApi(): Promise<FinanceAccount[]> {
  if (!isApiConfigured()) {
    return getMockCOARootFirst().map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
    }));
  }
  const payload = await apiRequest<{ items: Array<{ id: string; code: string; name: string; type: string }> }>(
    "/api/finance/accounts"
  );
  return payload.items ?? [];
}

export async function createFinanceAccountApi(payload: {
  code: string;
  name: string;
  type: string;
  parentId?: string;
  currency?: string;
}): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest("/api/finance/accounts", {
    method: "POST",
    body: payload,
  });
}

export async function fetchPostingMappingsApi(): Promise<{
  items: PostingMappingRow[];
  accounts: FinanceAccount[];
}> {
  if (!isApiConfigured()) {
    const accounts = await fetchFinanceAccountsApi();
    return {
      items: [
        {
          key: "accountsReceivableAccountId",
          label: "Accounts receivable",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "1100", name: "Accounts Receivable", type: "ASSET" },
        },
        {
          key: "salesRevenueAccountId",
          label: "Sales revenue",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "4000", name: "Sales Revenue", type: "REVENUE" },
        },
        {
          key: "accountsPayableAccountId",
          label: "Accounts payable",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "2100", name: "Accounts Payable", type: "LIABILITY" },
        },
        {
          key: "purchaseExpenseAccountId",
          label: "Purchase expense",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "5100", name: "Purchases Expense", type: "EXPENSE" },
        },
        {
          key: "inventoryAccountId",
          label: "Inventory",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "1300", name: "Inventory", type: "ASSET" },
        },
        {
          key: "goodsReceivedNotInvoicedAccountId",
          label: "Goods received not invoiced",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "2200", name: "Goods Received Not Invoiced", type: "LIABILITY" },
        },
        {
          key: "bankClearingAccountId",
          label: "Bank clearing",
          accountId: null,
          accountCode: null,
          accountName: null,
          fallback: { code: "1120", name: "Main Bank", type: "ASSET" },
        },
      ],
      accounts,
    };
  }
  return apiRequest<{ items: PostingMappingRow[]; accounts: FinanceAccount[] }>(
    "/api/settings/financial/posting-mappings"
  );
}

export async function savePostingMappingsApi(
  mappings: Partial<Record<PostingMappingKey, string | null>>
): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest("/api/settings/financial/posting-mappings", {
    method: "PATCH",
    body: mappings,
  });
}
