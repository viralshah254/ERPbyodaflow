import { type CustomerType, type PartyRole, type PartyRow, type SupplierType } from "@/lib/mock/masters";
import { apiRequest, requireLiveApi } from "./client";

type BackendParty = {
  id: string;
  name: string;
  roles?: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  channel?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  creditLimit?: number;
  paymentTermsId?: string;
  defaultCurrency?: string;
  status?: string;
};

export type PartyPayload = {
  name: string;
  roles: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  email?: string;
  phone?: string;
  taxId?: string;
  creditLimit?: number;
  paymentTermsId?: string;
  defaultCurrency?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type PartyDetail = PartyRow & {
  taxId?: string;
  creditLimit?: number;
  paymentTermsId?: string;
  defaultCurrency?: string;
};

function mapParty(item: BackendParty): PartyRow {
  const roles = item.roles ?? [];
  return {
    id: item.id,
    name: item.name,
    type: roles.includes("supplier") ? "supplier" : "customer",
    roles,
    customerType: item.customerType,
    supplierType: item.supplierType,
    email: item.email,
    phone: item.phone,
    status: item.status ?? "ACTIVE",
  };
}

export async function fetchPartiesApi(filters?: {
  role?: PartyRole;
  customerType?: CustomerType | "";
  supplierType?: SupplierType | "";
  status?: string;
  search?: string;
}): Promise<PartyRow[]> {
  requireLiveApi("Parties");
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.customerType) params.set("customerType", filters.customerType);
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
  const created = await apiRequest<{ id: string }>("/api/parties", {
    method: "POST",
    body: payload,
  });
  return {
    id: created.id,
    name: payload.name,
    type: payload.roles.includes("supplier") ? "supplier" : "customer",
    roles: payload.roles,
    customerType: payload.customerType,
    supplierType: payload.supplierType,
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
    paymentTermsId: data.paymentTermsId,
    defaultCurrency: data.defaultCurrency,
  };
}
