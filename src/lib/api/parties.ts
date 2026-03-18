import { type CustomerType, type PartyRole, type PartyRow, type SupplierType } from "@/lib/types/masters";
import { apiRequest, requireLiveApi } from "./client";

type BackendParty = {
  id: string;
  name: string;
  code?: string;
  roles?: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  channel?: string;
  customerCategoryId?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  creditLimit?: number;
  creditLimitAmount?: number;
  creditControlMode?: "AMOUNT" | "DAYS" | "HYBRID";
  maxOutstandingInvoiceAgeDays?: number;
  perInvoiceDaysToPayCap?: number;
  creditWarningThresholdPct?: number;
  paymentTermsId?: string;
  defaultCurrency?: string;
  status?: string;
};

export type PartyPayload = {
  name: string;
  roles: PartyRole[];
  code?: string;
  customerType?: CustomerType;
  supplierType?: SupplierType;
  customerCategoryId?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  creditLimit?: number;
  creditLimitAmount?: number;
  creditControlMode?: "AMOUNT" | "DAYS" | "HYBRID";
  maxOutstandingInvoiceAgeDays?: number;
  perInvoiceDaysToPayCap?: number;
  creditWarningThresholdPct?: number;
  paymentTermsId?: string;
  defaultCurrency?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type PartyDetail = PartyRow & {
  customerCategoryId?: string;
  taxId?: string;
  creditLimit?: number;
  creditLimitAmount?: number;
  creditControlMode?: "AMOUNT" | "DAYS" | "HYBRID";
  maxOutstandingInvoiceAgeDays?: number;
  perInvoiceDaysToPayCap?: number;
  creditWarningThresholdPct?: number;
  paymentTermsId?: string;
  defaultCurrency?: string;
};

export type PartyLookupOption = {
  id: string;
  label: string;
  description?: string;
  code?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  badges?: Array<{
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }>;
};

function buildPartyLookupDescription(item: {
  code?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}) {
  const parts = [item.code, item.phone, item.email, item.taxId].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

function scorePartyLookupOption(option: PartyLookupOption, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  const label = option.label.toLowerCase();
  const code = option.code?.toLowerCase() ?? "";
  const phone = option.phone?.toLowerCase() ?? "";
  const email = option.email?.toLowerCase() ?? "";
  const taxId = option.taxId?.toLowerCase() ?? "";
  if (code === normalized) return 0;
  if (phone === normalized) return 1;
  if (taxId === normalized) return 2;
  if (email === normalized) return 3;
  if (label === normalized) return 4;
  if (code.startsWith(normalized)) return 5;
  if (label.startsWith(normalized)) return 6;
  if (phone.includes(normalized)) return 7;
  if (email.includes(normalized)) return 8;
  if (taxId.includes(normalized)) return 9;
  if (label.includes(normalized)) return 10;
  return 99;
}

export function sortPartyLookupOptions(options: PartyLookupOption[], query: string) {
  return [...options].sort((left, right) => {
    const leftScore = scorePartyLookupOption(left, query);
    const rightScore = scorePartyLookupOption(right, query);
    if (leftScore !== rightScore) return leftScore - rightScore;
    return left.label.localeCompare(right.label);
  });
}

export function toPartyLookupOption(item: {
  id?: string;
  partyId?: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  customerType?: CustomerType;
  supplierType?: SupplierType;
  status?: string;
  creditLimit?: number;
  creditLimitAmount?: number;
  outstandingBalance?: number;
}): PartyLookupOption {
  const effectiveCreditLimit = item.creditLimitAmount ?? item.creditLimit;
  const isOverCredit =
    effectiveCreditLimit != null &&
    effectiveCreditLimit > 0 &&
    (item.outstandingBalance ?? 0) > effectiveCreditLimit;

  const badges: PartyLookupOption["badges"] = [
    item.customerType
      ? {
          label: item.customerType.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase()),
          variant: "secondary",
        }
      : null,
    item.supplierType
      ? {
          label: item.supplierType.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase()),
          variant: "secondary",
        }
      : null,
    item.status && item.status !== "ACTIVE"
      ? {
          label: "Inactive",
          variant: "outline",
        }
      : null,
    isOverCredit
      ? {
          label: "Over credit",
          variant: "destructive",
        }
      : null,
  ].filter(Boolean) as NonNullable<PartyLookupOption["badges"]>;

  return {
    id: item.id ?? item.partyId ?? "",
    label: item.name,
    description: buildPartyLookupDescription(item),
    code: item.code,
    email: item.email,
    phone: item.phone,
    taxId: item.taxId,
    badges,
  };
}

function mapParty(item: BackendParty): PartyRow {
  const roles = item.roles ?? [];
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    type: roles.includes("supplier") ? "supplier" : "customer",
    roles,
    customerType: item.customerType,
    supplierType: item.supplierType,
    customerCategoryId: item.customerCategoryId,
    email: item.email,
    phone: item.phone,
    taxId: item.taxId,
    status: item.status ?? "ACTIVE",
  };
}

export async function fetchPartiesApi(filters?: {
  role?: PartyRole;
  customerType?: CustomerType | "";
  customerCategoryId?: string;
  supplierType?: SupplierType | "";
  status?: string;
  search?: string;
}): Promise<PartyRow[]> {
  requireLiveApi("Parties");
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.customerType) params.set("customerType", filters.customerType);
  if (filters?.customerCategoryId) params.set("customerCategoryId", filters.customerCategoryId);
  if (filters?.supplierType) params.set("supplierType", filters.supplierType);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  const data = await apiRequest<{ items: BackendParty[] }>("/api/parties", {
    params,
  });
  return data.items.map(mapParty);
}

export async function createPartyApi(payload: PartyPayload): Promise<PartyRow> {
  requireLiveApi("Party creation");
  const created = await apiRequest<{ id: string; code?: string }>("/api/parties", {
    method: "POST",
    body: payload,
  });
  return {
    id: created.id,
    name: payload.name,
    code: created.code ?? payload.code,
    type: payload.roles.includes("supplier") ? "supplier" : "customer",
    roles: payload.roles,
    customerType: payload.customerType,
    supplierType: payload.supplierType,
    customerCategoryId: payload.customerCategoryId,
    email: payload.email,
    phone: payload.phone,
    status: payload.status ?? "ACTIVE",
  };
}

export async function updatePartyApi(id: string, payload: Partial<PartyPayload>): Promise<PartyRow> {
  requireLiveApi("Party update");
  const updated = await apiRequest<BackendParty>(`/api/parties/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return mapParty(updated);
}

export async function fetchPartyByIdApi(id: string): Promise<PartyDetail | null> {
  requireLiveApi("Party detail");
  const data = await apiRequest<BackendParty>(`/api/parties/${id}`);
  const mapped = mapParty(data);
  return {
    ...mapped,
    taxId: data.taxId,
    creditLimit: data.creditLimit,
    creditLimitAmount: data.creditLimitAmount ?? data.creditLimit,
    creditControlMode: data.creditControlMode,
    maxOutstandingInvoiceAgeDays: data.maxOutstandingInvoiceAgeDays,
    perInvoiceDaysToPayCap: data.perInvoiceDaysToPayCap,
    creditWarningThresholdPct: data.creditWarningThresholdPct,
    customerCategoryId: data.customerCategoryId,
    paymentTermsId: data.paymentTermsId,
    defaultCurrency: data.defaultCurrency,
  };
}

export async function searchPartyLookupOptionsApi(filters?: {
  role?: PartyRole;
  customerType?: CustomerType | "";
  customerCategoryId?: string;
  supplierType?: SupplierType | "";
  status?: string;
  search?: string;
  limit?: number;
}): Promise<PartyLookupOption[]> {
  requireLiveApi("Party lookup");
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.customerType) params.set("customerType", filters.customerType);
  if (filters?.customerCategoryId) params.set("customerCategoryId", filters.customerCategoryId);
  if (filters?.supplierType) params.set("supplierType", filters.supplierType);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.limit) params.set("limit", String(filters.limit));
  const data = await apiRequest<{ items: BackendParty[] }>("/api/parties", {
    params,
  });
  return sortPartyLookupOptions(data.items.map((item) => toPartyLookupOption(item)), filters?.search ?? "");
}
