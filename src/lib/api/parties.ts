import {
  getMockParties,
  type CustomerType,
  type PartyRole,
  type PartyRow,
  type SupplierType,
} from "@/lib/mock/masters";
import { apiRequest, isApiConfigured } from "./client";

type BackendParty = {
  id: string;
  name: string;
  roles?: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  channel?: string;
  email?: string;
  phone?: string;
  status?: string;
};

export type PartyPayload = {
  name: string;
  roles: PartyRole[];
  customerType?: CustomerType;
  supplierType?: SupplierType;
  email?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE";
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
  if (!isApiConfigured()) {
    let rows = getMockParties();
    if (filters?.role) {
      rows = rows.filter((row) => row.roles?.includes(filters.role!));
    }
    if (filters?.customerType) {
      rows = rows.filter((row) => row.customerType === filters.customerType);
    }
    if (filters?.supplierType) {
      rows = rows.filter((row) => row.supplierType === filters.supplierType);
    }
    if (filters?.status) {
      rows = rows.filter((row) => row.status === filters.status);
    }
    if (filters?.search?.trim()) {
      const query = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(query) ||
          row.email?.toLowerCase().includes(query) ||
          row.phone?.toLowerCase().includes(query)
      );
    }
    return rows;
  }
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
  if (!isApiConfigured()) {
    return {
      id: `local-party-${Date.now()}`,
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
  if (!isApiConfigured()) {
    return {
      id,
      name: payload.name ?? "Updated party",
      type: payload.roles?.includes("supplier") ? "supplier" : "customer",
      roles: payload.roles ?? ["customer"],
      customerType: payload.customerType,
      supplierType: payload.supplierType,
      email: payload.email,
      phone: payload.phone,
      status: payload.status ?? "ACTIVE",
    };
  }
  const updated = await apiRequest<BackendParty>(`/api/parties/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return mapParty(updated);
}
