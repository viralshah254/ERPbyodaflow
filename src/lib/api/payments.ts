import { apiRequest, requireLiveApi } from "@/lib/api/client";
import { sortPartyLookupOptions, toPartyLookupOption, type PartyLookupOption } from "@/lib/api/parties";
import type { APBillRow, APPaymentRow } from "@/lib/types/ap";
import type { OpenInvoiceRow, PaymentRow } from "@/lib/types/ar";

export type OpenBillRow = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  partyId?: string;
  supplierName?: string;
  total: number;
  allocated: number;
  outstanding: number;
  status: string;
  currency?: string;
};

type BackendPayment = {
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName?: string;
  amount: number;
  status: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
  openAmount?: number;
  appliedAmount?: number;
};

type BackendOpenInvoice = {
  id: string;
  number: string;
  date: string;
  customerId?: string;
  customerName?: string;
  total: number;
  allocated: number;
  outstanding: number;
  dueDate?: string;
  status: string;
  currency?: string;
};

type BackendOpenBill = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  partyId?: string;
  supplierName?: string;
  total: number;
  allocated: number;
  outstanding: number;
  status: string;
  currency?: string;
};

type BackendApBill = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  partyId?: string;
  supplierName?: string;
  total: number;
  status: string;
};

type BackendPartyOption = {
  id: string;
  partyId?: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  customerType?: import("@/lib/types/masters").CustomerType;
  supplierType?: import("@/lib/types/masters").SupplierType;
  status?: string;
  creditLimit?: number;
  creditLimitAmount?: number;
  outstandingBalance?: number;
};

export type ArCustomerSummary = {
  id: string;
  partyId: string;
  name: string;
  customerType?: import("@/lib/types/masters").CustomerType;
  email?: string;
  phone?: string;
  code?: string;
  taxId?: string;
  creditLimit?: number;
  creditLimitAmount?: number;
  creditControlMode?: "AMOUNT" | "DAYS" | "HYBRID";
  customerCategoryId?: string;
  maxOutstandingInvoiceAgeDays?: number;
  perInvoiceDaysToPayCap?: number;
  creditWarningThresholdPct?: number;
  paymentTermsId?: string;
  status?: string;
  outstandingBalance?: number;
  openInvoiceCount?: number;
};

export type ApSupplierSummary = {
  id: string;
  partyId: string;
  name: string;
  supplierType?: import("@/lib/types/masters").SupplierType;
  email?: string;
  phone?: string;
  code?: string;
  taxId?: string;
  paymentTermsId?: string;
  status?: string;
  currency?: string;
};

export async function fetchArPaymentsApi(): Promise<PaymentRow[]> {
  requireLiveApi("AR payments");
  const payload = await apiRequest<{ items: BackendPayment[] }>("/api/ar/payments");
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date,
    customerId: item.partyId,
    customerName: item.partyName ?? item.partyId,
    amount: item.amount,
    status: item.status,
    paymentMethod: item.paymentMethod,
    mpesaTransactionNo: item.mpesaTransactionNo,
  }));
}

export async function fetchArCustomersApi(search?: string): Promise<Array<{ id: string; name: string }>> {
  requireLiveApi("AR customers");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ar/customers", { params });
  return payload.items.map((item) => ({ id: item.id ?? item.partyId ?? "", name: item.name }));
}

export async function searchArCustomerOptionsApi(search?: string): Promise<PartyLookupOption[]> {
  requireLiveApi("AR customer lookup");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ar/customers", { params });
  return sortPartyLookupOptions(
    payload.items.map((item) =>
      toPartyLookupOption({
        ...item,
        creditLimitAmount: item.creditLimitAmount,
        creditLimit: item.creditLimit,
        outstandingBalance: item.outstandingBalance,
      })
    ),
    search ?? ""
  );
}

export async function fetchArCustomerSummariesApi(search?: string): Promise<ArCustomerSummary[]> {
  requireLiveApi("AR customer summaries");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: ArCustomerSummary[] }>("/api/ar/customers", { params });
  return payload.items ?? [];
}

export async function fetchOpenInvoicesApi(customerId?: string): Promise<OpenInvoiceRow[]> {
  requireLiveApi("Open invoices");
  const params = new URLSearchParams();
  if (customerId) params.set("partyId", customerId);
  const payload = await apiRequest<{ items: BackendOpenInvoice[] }>("/api/ar/open-invoices", { params });
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date,
    customerId: item.customerId ?? "",
    customerName: item.customerName ?? item.customerId ?? "",
    total: item.total,
    allocated: item.allocated,
    outstanding: item.outstanding,
    dueDate: item.dueDate ?? item.date,
    status: item.status,
    currency: item.currency,
  }));
}

export async function createArPaymentApi(body: {
  customerId: string;
  amount: number;
  date?: string;
  bankAccountId?: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
}): Promise<{ id: string; number: string }> {
  requireLiveApi("AR payment creation");
  return apiRequest<{ id: string; number: string }>("/api/ar/payments", {
    method: "POST",
    body: {
      partyId: body.customerId,
      amount: body.amount,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      bankAccountId: body.bankAccountId,
      paymentMethod: body.paymentMethod,
      mpesaTransactionNo: body.mpesaTransactionNo,
    },
  });
}

export async function allocateArPaymentApi(paymentId: string, allocations: { documentId: string; amount: number }[]): Promise<void> {
  requireLiveApi("AR allocation");
  await apiRequest(`/api/ar/payments/${encodeURIComponent(paymentId)}/allocate`, {
    method: "POST",
    body: { allocations },
  });
}

export async function submitArPaymentApi(paymentId: string): Promise<{ id: string; status: string }> {
  requireLiveApi("AR payment submit");
  return apiRequest<{ id: string; status: string }>(`/api/ar/payments/${encodeURIComponent(paymentId)}/submit`, {
    method: "POST",
  });
}

export async function fetchApPaymentsApi(): Promise<APPaymentRow[]> {
  requireLiveApi("AP payments");
  const payload = await apiRequest<{ items: BackendPayment[] }>("/api/ap/payments");
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date,
    party: item.partyName ?? item.partyId,
    amount: item.amount,
    status: item.status,
    paymentMethod: item.paymentMethod,
    mpesaTransactionNo: item.mpesaTransactionNo,
  }));
}

export async function fetchApBillsApi(search?: string): Promise<APBillRow[]> {
  requireLiveApi("AP bills");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendApBill[] }>("/api/ap/bills", { params });
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.supplierName ?? item.partyId ?? "",
    total: item.total ?? 0,
    status: item.status ?? "DRAFT",
    dueDate: item.dueDate?.slice(0, 10),
  }));
}

export async function fetchApSuppliersApi(search?: string): Promise<Array<{ id: string; name: string }>> {
  requireLiveApi("AP suppliers");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ap/suppliers", { params });
  return payload.items.map((item) => ({ id: item.id ?? item.partyId ?? "", name: item.name }));
}

export async function searchApSupplierOptionsApi(search?: string): Promise<PartyLookupOption[]> {
  requireLiveApi("AP supplier lookup");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ap/suppliers", { params });
  return sortPartyLookupOptions(payload.items.map((item) => toPartyLookupOption(item)), search ?? "");
}

export async function fetchApSupplierSummariesApi(search?: string): Promise<ApSupplierSummary[]> {
  requireLiveApi("AP supplier summaries");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: ApSupplierSummary[] }>("/api/ap/suppliers", { params });
  return payload.items ?? [];
}

export async function fetchOpenBillsApi(supplierId?: string): Promise<OpenBillRow[]> {
  requireLiveApi("Open bills");
  const params = new URLSearchParams();
  if (supplierId) params.set("partyId", supplierId);
  const payload = await apiRequest<{ items: BackendOpenBill[] }>("/api/ap/open-bills", { params });
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date,
    dueDate: item.dueDate,
    partyId: item.partyId,
    supplierName: item.supplierName,
    total: item.total,
    allocated: item.allocated,
    outstanding: item.outstanding,
    status: item.status,
    currency: item.currency,
  }));
}

export async function createApPaymentApi(body: {
  supplierId: string;
  amount: number;
  date?: string;
  bankAccountId?: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
}): Promise<{ id: string; number: string }> {
  requireLiveApi("AP payment creation");
  return apiRequest<{ id: string; number: string }>("/api/ap/payments", {
    method: "POST",
    body: {
      partyId: body.supplierId,
      amount: body.amount,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      bankAccountId: body.bankAccountId,
      paymentMethod: body.paymentMethod,
      mpesaTransactionNo: body.mpesaTransactionNo,
    },
  });
}

export async function allocateApPaymentApi(paymentId: string, allocations: { documentId: string; amount: number }[]): Promise<void> {
  requireLiveApi("AP allocation");
  await apiRequest(`/api/ap/payments/${encodeURIComponent(paymentId)}/allocate`, {
    method: "POST",
    body: { allocations },
  });
}
