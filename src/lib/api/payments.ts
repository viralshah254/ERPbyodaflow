import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  createApPayment as createLocalApPayment,
  listApPayments as listLocalApPayments,
} from "@/lib/data/ap-payments.repo";
import {
  createArPayment as createLocalArPayment,
  listArPayments as listLocalArPayments,
  listOpenInvoices as listLocalOpenInvoices,
} from "@/lib/data/ar.repo";
import type { APPaymentRow } from "@/lib/mock/ap";
import type { OpenInvoiceRow, PaymentRow } from "@/lib/mock/ar";
import { fetchPartiesApi } from "@/lib/api/parties";

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

type BackendPartyOption = {
  id: string;
  partyId?: string;
  name: string;
};

export async function fetchArPaymentsApi(): Promise<PaymentRow[]> {
  if (!isApiConfigured()) return listLocalArPayments();
  const payload = await apiRequest<{ items: BackendPayment[] }>("/api/ar/payments");
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date,
    customerId: item.partyId,
    customerName: item.partyName ?? item.partyId,
    amount: item.amount,
    status: item.status,
  }));
}

export async function fetchArCustomersApi(search?: string): Promise<Array<{ id: string; name: string }>> {
  if (!isApiConfigured()) {
    const items = await fetchPartiesApi({ role: "customer", search });
    return items.map((item) => ({ id: item.id, name: item.name }));
  }
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ar/customers", { params });
  return payload.items.map((item) => ({ id: item.id ?? item.partyId ?? "", name: item.name }));
}

export async function fetchOpenInvoicesApi(customerId?: string): Promise<OpenInvoiceRow[]> {
  if (!isApiConfigured()) return listLocalOpenInvoices(customerId);
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
  }));
}

export async function createArPaymentApi(body: {
  customerId: string;
  amount: number;
  date?: string;
}): Promise<{ id: string; number: string }> {
  if (!isApiConfigured()) {
    const created = createLocalArPayment({
      customerId: body.customerId,
      customerName: body.customerId,
      amount: body.amount,
    });
    return { id: created.id, number: created.number };
  }
  return apiRequest<{ id: string; number: string }>("/api/ar/payments", {
    method: "POST",
    body: {
      partyId: body.customerId,
      amount: body.amount,
      date: body.date ?? new Date().toISOString().slice(0, 10),
    },
  });
}

export async function allocateArPaymentApi(paymentId: string, allocations: { documentId: string; amount: number }[]): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`/api/ar/payments/${encodeURIComponent(paymentId)}/allocate`, {
    method: "POST",
    body: { allocations },
  });
}

export async function fetchApPaymentsApi(): Promise<APPaymentRow[]> {
  if (!isApiConfigured()) return listLocalApPayments();
  const payload = await apiRequest<{ items: BackendPayment[] }>("/api/ap/payments");
  return payload.items.map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date,
    party: item.partyName ?? item.partyId,
    amount: item.amount,
    status: item.status,
  }));
}

export async function fetchApSuppliersApi(search?: string): Promise<Array<{ id: string; name: string }>> {
  if (!isApiConfigured()) {
    const items = await fetchPartiesApi({ role: "supplier", search });
    return items.map((item) => ({ id: item.id, name: item.name }));
  }
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendPartyOption[] }>("/api/ap/suppliers", { params });
  return payload.items.map((item) => ({ id: item.id ?? item.partyId ?? "", name: item.name }));
}

export async function fetchOpenBillsApi(supplierId?: string): Promise<OpenBillRow[]> {
  if (!isApiConfigured()) return [];
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
}): Promise<{ id: string; number: string }> {
  if (!isApiConfigured()) {
    const created = createLocalApPayment({ party: body.supplierId, amount: body.amount });
    return { id: created.id, number: created.number };
  }
  return apiRequest<{ id: string; number: string }>("/api/ap/payments", {
    method: "POST",
    body: {
      partyId: body.supplierId,
      amount: body.amount,
      date: body.date ?? new Date().toISOString().slice(0, 10),
    },
  });
}

export async function allocateApPaymentApi(paymentId: string, allocations: { documentId: string; amount: number }[]): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`/api/ap/payments/${encodeURIComponent(paymentId)}/allocate`, {
    method: "POST",
    body: { allocations },
  });
}
