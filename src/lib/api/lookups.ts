import { apiRequest, requireLiveApi } from "@/lib/api/client";

export interface LookupOption {
  id: string;
  label: string;
  /** When set, warehouse belongs to this branch (for defaulting GRN warehouse from PO branch). */
  branchId?: string;
  transferSourceBlock?: string;
}

export async function fetchBranchOptions(): Promise<LookupOption[]> {
  requireLiveApi("Branch options");
  const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string }> }>("/api/branches");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));
}

function transferSourceBlock(warehouse: {
  status?: string; purpose?: string; stockDisposition?: string; dispositionPending?: string;
}): string | undefined {
  const { status, purpose, stockDisposition, dispositionPending } = warehouse;
  if (status?.trim().toUpperCase() === "INACTIVE") return "Inactive";
  const use = purpose?.trim().toUpperCase();
  if (use === "TRANSIT" || use === "QUARANTINE") return "Use the designated stock workflow";
  if (use !== "STORAGE" && use !== "RECEIVING" && use !== "DISPATCH") return "Needs classification";
  const disposition = stockDisposition?.trim().toUpperCase();
  const pending = dispositionPending?.trim().toUpperCase();
  const holdPending = pending === "QUARANTINE" || pending === "DAMAGED" || pending === "EXPIRED" || pending === "TRANSIT";
  if ((disposition && disposition !== "USABLE") || holdPending) return "Stock on hold";
}

export async function fetchWarehouseOptions({ includeTransferEligibility = false } = {}): Promise<LookupOption[]> {
  requireLiveApi("Warehouse options");
  const result: LookupOption[] = [], seen = new Set<string>();
  for (let offset = 0; offset < 5000; offset += 50) {
    const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string; branchId?: string; status?: string; purpose?: string; stockDisposition?: string; dispositionPending?: string }> }>("/api/master/warehouses", { params: { limit: "50", offset: String(offset) } });
    if (!Array.isArray(payload.items)) throw new Error("Warehouse options could not be loaded completely. Refresh before selecting a store.");
    for (const item of payload.items) {
      if (!item.id || seen.has(item.id)) throw new Error("Warehouse pagination is incomplete. Refresh or contact your administrator.");
      seen.add(item.id);
      result.push({
        id: item.id,
        label: item.code ? `${item.code} - ${item.name}` : item.name,
        branchId: item.branchId,
        ...(includeTransferEligibility ? { transferSourceBlock: transferSourceBlock(item) } : {}),
      });
    }
    if (payload.items.length < 50) return result;
  }
  throw new Error("Narrow the warehouse catalogue before loading more than 5,000 stores.");
}
