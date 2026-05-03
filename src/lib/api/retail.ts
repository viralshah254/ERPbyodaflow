import { apiRequest } from "@/lib/api/client";

export type RetailPosContextPayload = {
  walkInPartyId: string;
  defaultWarehouseId?: string;
  defaultBranchId?: string;
  parentOrgId?: string;
  orgRole?: string;
};

export async function fetchRetailPosContextApi(): Promise<RetailPosContextPayload> {
  return apiRequest<RetailPosContextPayload>("/api/retail/pos-context", {});
}
