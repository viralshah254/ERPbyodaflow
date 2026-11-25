import { apiRequest, requireLiveApi } from "@/lib/api/client";

export interface LookupOption {
  id: string;
  label: string;
  /** When set, warehouse belongs to this branch (for defaulting GRN warehouse from PO branch). */
  branchId?: string;
  /** Why stock cannot be transferred out of this store. */
  transferSourceBlock?: string;
  transferSourceIssue?: TransferSourceIssue;
  /** Why stock cannot be transferred into this store. */
  transferTargetIssue?: TransferSourceIssue;
}

export async function fetchBranchOptions(): Promise<LookupOption[]> {
  requireLiveApi("Branch options");
  const payload = await apiRequest<{ items: Array<{ id: string; name: string; code?: string }> }>("/api/branches");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.code ? `${item.code} - ${item.name}` : item.name,
  }));
}

export type TransferSourceIssue = {
  /** Short tag beside the store in the picker. */
  label: string;
  /** What is wrong, in plain words. */
  reason: string;
  /** What to change on the store. */
  fix: string;
  href: string;
};

function transferSourceIssue(warehouse: {
  id: string; name: string; status?: string; purpose?: string; stockDisposition?: string; dispositionPending?: string;
}): TransferSourceIssue | undefined {
  const { id, name, status, purpose, stockDisposition, dispositionPending } = warehouse;
  const href = `/master/warehouses?edit=${encodeURIComponent(id)}`;
  if (status?.trim().toUpperCase() === "INACTIVE") {
    return { label: "Switched off", reason: `${name} is switched off, so nothing can be sent from it.`, fix: "Switch the store back on", href };
  }
  const use = purpose?.trim().toUpperCase();
  const disposition = stockDisposition?.trim().toUpperCase();
  if (disposition === "TRANSIT") {
    return { label: "Goods in transit", reason: `${name} only holds goods on the road. They leave it when the receiving store confirms them.`, fix: "Open the store", href };
  }
  if (use === "QUARANTINE") {
    return { label: "Quality hold", reason: `${name} holds stock waiting for quality checks. It moves out when QC releases it.`, fix: "Open the store", href };
  }
  if (use !== "STORAGE" && use !== "RECEIVING" && use !== "DISPATCH" && use !== "TRANSIT") {
    return {
      label: "Purpose not set",
      reason: `${name} has no purpose set, so the ERP cannot tell if its stock may be sent out.`,
      fix: "Set its purpose, for example Transit for a route store",
      href,
    };
  }
  const pending = dispositionPending?.trim().toUpperCase();
  const holdPending = pending === "QUARANTINE" || pending === "DAMAGED" || pending === "EXPIRED" || pending === "TRANSIT";
  if ((disposition && disposition !== "USABLE") || holdPending) {
    const why = (holdPending ? pending : disposition)!.toLowerCase();
    return { label: "Stock on hold", reason: `Stock in ${name} is marked ${why}, so it cannot be sent out.`, fix: "Release it as usable", href };
  }
}

function transferTargetIssue(warehouse: { id: string; name: string; status?: string; purpose?: string; stockDisposition?: string }): TransferSourceIssue | undefined {
  const href = `/master/warehouses?edit=${encodeURIComponent(warehouse.id)}`;
  if (warehouse.status?.trim().toUpperCase() === "INACTIVE") {
    return { label: "Switched off", reason: `${warehouse.name} is switched off, so it cannot receive stock.`, fix: "Switch the store back on", href };
  }
  const use = warehouse.purpose?.trim().toUpperCase();
  if (!use) {
    return {
      label: "Purpose not set",
      reason: `${warehouse.name} has no purpose set, so the ERP will not put stock into it.`,
      fix: "Set its purpose, for example Transit for a route store",
      href,
    };
  }
  if (warehouse.stockDisposition?.trim().toUpperCase() === "TRANSIT") {
    return { label: "Goods in transit", reason: `${warehouse.name} is a transit store. Transfers go to the real receiving store instead.`, fix: "Change its purpose", href };
  }
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
        ...(includeTransferEligibility ? (() => {
          const named = { ...item, name: item.code ? `${item.code} - ${item.name}` : item.name };
          const issue = transferSourceIssue(named);
          const target = transferTargetIssue(named);
          return {
            ...(issue ? { transferSourceBlock: issue.label, transferSourceIssue: issue } : {}),
            ...(target ? { transferTargetIssue: target } : {}),
          };
        })() : {}),
      });
    }
    if (payload.items.length < 50) return result;
  }
  throw new Error("Narrow the warehouse catalogue before loading more than 5,000 stores.");
}
