import { apiRequest, downloadFile, isApiConfigured, requireLiveApi } from "@/lib/api/client";
import type { BankAccountRow, BillDueRow, OverdueInvoiceRow, PaymentMethod, PaymentRunRow } from "@/lib/types/treasury";

type BackendBankAccount = {
  id: string;
  name: string;
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  currency: string;
  glAccountId?: string;
  glAccountCode?: string;
  glAccountName?: string;
  isActive?: boolean;
};

type BackendPaymentRun = {
  id: string;
  number: string;
  date: string;
  status: string;
  totalAmount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  supplierCount: number;
  billCount: number;
  bankAccountId?: string;
  bankAccountName?: string;
  suppliers?: string[];
};

type BackendPaymentRunDetail = BackendPaymentRun & {
  lines?: Array<{
    id: string;
    supplierId: string;
    supplierName?: string;
    billId?: string;
    billNumber?: string;
    amount: number;
    currency: string;
  }>;
};

function mapBankAccount(account: BackendBankAccount): BankAccountRow {
  return {
    id: account.id,
    name: account.name,
    accountNumber: account.accountNumber,
    bank: account.bankName ?? "Bank",
    branch: account.branchName,
    currency: account.currency,
    glAccountId: account.glAccountId,
    glAccountCode: account.glAccountCode,
    glAccountName: account.glAccountName,
    active: account.isActive ?? true,
  };
}

function mapPaymentRun(run: BackendPaymentRun): PaymentRunRow {
  return {
    id: run.id,
    number: run.number,
    date: run.date.slice(0, 10),
    status:
      run.status === "EXPORTED"
        ? "PROCESSED"
        : (run.status as PaymentRunRow["status"]),
    totalAmount: run.totalAmount,
    currency: run.currency,
    supplierCount: run.supplierCount,
    billCount: run.billCount,
    paymentMethod: run.paymentMethod ?? "BANK_TRANSFER",
  };
}

export async function fetchBankAccountsApi(): Promise<BankAccountRow[]> {
  requireLiveApi("Treasury bank accounts");
  const payload = await apiRequest<{ items: BackendBankAccount[] }>("/api/treasury/bank-accounts");
  return payload.items.map(mapBankAccount);
}

export async function createBankAccountApi(body: Omit<BankAccountRow, "id">): Promise<void> {
  requireLiveApi("Create bank account");
  await apiRequest("/api/treasury/bank-accounts", {
    method: "POST",
    body: {
      name: body.name,
      accountNumber: body.accountNumber,
      bankName: body.bank,
      branchName: body.branch,
      currency: body.currency,
      glAccountId: body.glAccountId,
      isActive: body.active,
    },
  });
}

export async function updateBankAccountApi(id: string, body: Partial<BankAccountRow>): Promise<void> {
  requireLiveApi("Update bank account");
  await apiRequest(`/api/treasury/bank-accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      name: body.name,
      accountNumber: body.accountNumber,
      bankName: body.bank,
      branchName: body.branch,
      currency: body.currency,
      glAccountId: body.glAccountId,
      isActive: body.active,
    },
  });
}

export async function fetchPaymentRunsApi(): Promise<PaymentRunRow[]> {
  requireLiveApi("Payment runs");
  const payload = await apiRequest<{ items: BackendPaymentRun[] }>("/api/treasury/payment-runs");
  return payload.items.map(mapPaymentRun);
}

export async function fetchPaymentRunApi(id: string): Promise<BackendPaymentRunDetail | null> {
  requireLiveApi("Payment run detail");
  return apiRequest<BackendPaymentRunDetail>(`/api/treasury/payment-runs/${encodeURIComponent(id)}`);
}

export async function fetchBillsDueApi(): Promise<BillDueRow[]> {
  requireLiveApi("Bills due");
  const payload = await apiRequest<{
    items: Array<{
      id: string;
      documentId?: string;
      number: string;
      date: string;
      dueDate?: string;
      partyId?: string;
      supplierName?: string;
      total: number;
      outstanding: number;
      currency?: string;
    }>;
  }>("/api/ap/open-bills");
  return payload.items.map((item) => ({
    id: item.id,
    billId: item.documentId ?? item.id,
    number: item.number,
    date: item.date.slice(0, 10),
    supplierId: item.partyId ?? "",
    supplier: item.supplierName ?? item.partyId ?? "Supplier",
    total: item.outstanding ?? item.total,
    currency: item.currency ?? "KES",
    dueDate: item.dueDate?.slice(0, 10) ?? item.date.slice(0, 10),
  }));
}

export async function createPaymentRunApi(body: {
  bankAccountId: string;
  paymentMethod: PaymentMethod;
  bills: BillDueRow[];
}): Promise<void> {
  requireLiveApi("Create payment run");
  await apiRequest("/api/treasury/payment-runs", {
    method: "POST",
    body: {
      bankAccountId: body.bankAccountId,
      paymentMethod: body.paymentMethod,
      lines: body.bills.map((bill) => ({
        supplierId: bill.supplierId,
        billId: bill.billId,
        amount: bill.total,
      })),
    },
  });
}

export async function approvePaymentRunApi(id: string): Promise<void> {
  requireLiveApi("Approve payment run");
  await apiRequest(`/api/treasury/payment-runs/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

export function exportPaymentRunApi(id: string, onError: (message: string) => void): void {
  requireLiveApi("Payment run export");
  void downloadFile(`/api/treasury/payment-runs/${encodeURIComponent(id)}/export`, `payment-run-${id}.csv`, onError);
}

export async function fetchCollectionsApi(): Promise<OverdueInvoiceRow[]> {
  requireLiveApi("Collections");
  const payload = await apiRequest<{
    items: Array<{
      id: string;
      documentId: string;
      number: string;
      customerId?: string;
      customerName?: string;
      total: number;
      outstanding: number;
      dueDate?: string;
      date: string;
    }>;
  }>("/api/ar/open-invoices");
  const today = new Date().toISOString().slice(0, 10);
  return payload.items
    .filter((item) => (item.dueDate ?? item.date) < today)
    .map((item) => {
      const dueDate = (item.dueDate ?? item.date).slice(0, 10);
      const daysOverdue = Math.max(
        0,
        Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000)
      );
      return {
        id: item.id,
        number: item.number,
        customerId: item.customerId ?? "",
        customerName: item.customerName ?? item.customerId ?? "Customer",
        total: item.total,
        outstanding: item.outstanding,
        currency: "KES",
        dueDate,
        daysOverdue,
      };
    });
}
