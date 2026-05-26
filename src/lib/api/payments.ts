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
  exchangeRate?: number;
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  grnId?: string;
  grnNumber?: string;
  poRef?: string;
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
  allocations?: Array<{
    documentType: string;
    documentId: string;
    documentNumber?: string;
    amount: number;
  }>;
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
  exchangeRate?: number;
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
  exchangeRate?: number;
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  grnId?: string;
  grnNumber?: string;
  poRef?: string;
};

type BackendApBill = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  partyId?: string;
  supplierName?: string;
  total: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
  allocated?: number;
  outstanding?: number;
  poRef?: string;
  grnNumber?: string;
  isLandedCostBill?: boolean;
  costType?: string;
  costReference?: string;
  sourceGrnId?: string;
  sourceGrnNumber?: string;
  allocationId?: string;
  costAttachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  economicTotal?: number;
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
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
  coolcatchSupplierKind?: import("@/lib/types/masters").CoolcatchSupplierKind;
  contactPersonFirstName?: string;
  contactPersonLastName?: string;
  email?: string;
  phone?: string;
  code?: string;
  taxId?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  pinCertificateUrl?: string;
  companyRegistrationUrl?: string;
  paymentTermsId?: string;
  paymentTermsName?: string;
  status?: string;
  currency?: string;
  defaultCurrency?: string;
  supplierBankAccountName?: string;
  supplierBankAccountNumber?: string;
  supplierBankBranchName?: string;
};

export type FetchApSuppliersPageOpts = {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "all";
};

export type FetchApSuppliersPageResult = {
  items: ApSupplierSummary[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

function apSuppliersQueryParams(filters?: FetchApSuppliersPageOpts): URLSearchParams {
  const params = new URLSearchParams();
  const lim = filters?.limit != null ? Math.min(Math.max(filters.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (filters?.cursor != null && filters.cursor !== "") {
    params.set("cursor", filters.cursor);
  }
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  return params;
}

export async function fetchApSuppliersPageApi(
  filters?: FetchApSuppliersPageOpts,
): Promise<FetchApSuppliersPageResult> {
  requireLiveApi("AP suppliers");
  const lim = filters?.limit != null ? Math.min(Math.max(filters.limit, 1), 100) : 25;
  const params = apSuppliersQueryParams(filters);
  const data = await apiRequest<{
    items: ApSupplierSummary[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/ap/suppliers", { params });
  const limit = typeof data.limit === "number" ? data.limit : lim;
  const parsedOffset =
    typeof data.offset === "number"
      ? data.offset
      : filters?.cursor != null && filters.cursor !== ""
        ? Number(filters.cursor) || 0
        : 0;
  const items = data.items ?? [];
  const hasMore =
    typeof data.hasMore === "boolean"
      ? data.hasMore
      : items.length === limit && limit > 0;
  let nextCursor: string | null;
  if (
    data.nextCursor !== undefined &&
    data.nextCursor !== null &&
    String(data.nextCursor) !== ""
  ) {
    nextCursor = String(data.nextCursor);
  } else if (hasMore) {
    nextCursor = String(parsedOffset + items.length);
  } else {
    nextCursor = null;
  }
  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

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
    exchangeRate: item.exchangeRate,
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
    date: typeof item.date === "string" ? item.date.slice(0, 10) : item.date,
    party: item.partyName ?? item.partyId,
    partyId: item.partyId,
    amount: item.amount,
    status: item.status,
    paymentMethod: item.paymentMethod,
    mpesaTransactionNo: item.mpesaTransactionNo,
    openAmount: item.openAmount,
    appliedAmount: item.appliedAmount,
    allocations: item.allocations?.map((allocation) => ({
      documentType: allocation.documentType,
      documentId: allocation.documentId,
      documentNumber: allocation.documentNumber,
      amount: allocation.amount,
    })),
  }));
}

export type FetchApBillsPageOpts = {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: string;
  partyId?: string;
};

export type FetchApBillsPageResult = {
  items: APBillRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

function mapApBillItem(item: BackendApBill): APBillRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date?.slice(0, 10) ?? "",
    party: item.supplierName ?? item.partyId ?? "",
    total: item.total ?? 0,
    currency: item.currency,
    exchangeRate: item.exchangeRate,
    status: item.status ?? "DRAFT",
    dueDate: item.dueDate?.slice(0, 10),
    allocated: item.allocated,
    outstanding: item.outstanding,
    poRef: item.poRef,
    grnNumber: item.grnNumber,
    isLandedCostBill: item.isLandedCostBill,
    costType: item.costType,
    costReference: item.costReference,
    sourceGrnId: item.sourceGrnId,
    sourceGrnNumber: item.sourceGrnNumber,
    allocationId: item.allocationId,
    costAttachments: item.costAttachments,
    economicTotal: item.economicTotal ?? item.total ?? 0,
  };
}

export async function fetchApBillsPageApi(
  filters?: FetchApBillsPageOpts,
): Promise<FetchApBillsPageResult> {
  requireLiveApi("AP bills");
  const lim = filters?.limit != null ? Math.min(Math.max(filters.limit, 1), 100) : 25;
  const params = new URLSearchParams();
  params.set("limit", String(lim));
  if (filters?.cursor != null && filters.cursor !== "") {
    params.set("cursor", filters.cursor);
  }
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.status?.trim()) params.set("status", filters.status.trim());
  if (filters?.partyId?.trim()) params.set("partyId", filters.partyId.trim());
  const data = await apiRequest<{
    items: BackendApBill[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/ap/bills", { params });
  const limit = typeof data.limit === "number" ? data.limit : lim;
  const parsedOffset =
    typeof data.offset === "number"
      ? data.offset
      : filters?.cursor != null && filters.cursor !== ""
        ? Number(filters.cursor) || 0
        : 0;
  const items = (data.items ?? []).map(mapApBillItem);
  const hasMore =
    typeof data.hasMore === "boolean"
      ? data.hasMore
      : items.length === limit && limit > 0;
  let nextCursor: string | null;
  if (
    data.nextCursor !== undefined &&
    data.nextCursor !== null &&
    String(data.nextCursor) !== ""
  ) {
    nextCursor = String(data.nextCursor);
  } else if (hasMore) {
    nextCursor = String(parsedOffset + items.length);
  } else {
    nextCursor = null;
  }
  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

export async function fetchApBillsApi(search?: string): Promise<APBillRow[]> {
  requireLiveApi("AP bills");
  const all: APBillRow[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await fetchApBillsPageApi({ search, limit: 100, cursor });
    all.push(...result.items);
    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return all;
}

export async function fetchApSuppliersApi(search?: string): Promise<Array<{ id: string; name: string }>> {
  requireLiveApi("AP suppliers");
  const params = apSuppliersQueryParams({ search, limit: 100, status: "all" });
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ap/suppliers", { params });
  return payload.items.map((item) => ({ id: item.id ?? item.partyId ?? "", name: item.name }));
}

export async function searchApSupplierOptionsApi(search?: string): Promise<PartyLookupOption[]> {
  requireLiveApi("AP supplier lookup");
  const params = apSuppliersQueryParams({ search, limit: 100, status: "all" });
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ap/suppliers", { params });
  return sortPartyLookupOptions(payload.items.map((item) => toPartyLookupOption(item)), search ?? "");
}

export async function fetchApSupplierSummariesApi(search?: string): Promise<ApSupplierSummary[]> {
  requireLiveApi("AP supplier summaries");
  const all: ApSupplierSummary[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await fetchApSuppliersPageApi({
      search,
      limit: 100,
      cursor,
      status: "all",
    });
    all.push(...result.items);
    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return all;
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
    exchangeRate: item.exchangeRate,
    landedAllocated: item.landedAllocated ?? 0,
    landedBreakdown: item.landedBreakdown ?? [],
    economicTotal: item.economicTotal ?? item.total,
    grnId: item.grnId,
    grnNumber: item.grnNumber,
    poRef: item.poRef,
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
