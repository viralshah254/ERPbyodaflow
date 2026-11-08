import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type InventoryCostingSettings = {
  method: "FIFO" | "WEIGHTED_AVERAGE" | "STANDARD_COST";
  allowNegative: boolean;
  activeValuationMethod?: "COMPANY_AVERAGE" | "WAREHOUSE_AVERAGE";
  valuationAccountCode?: string;
};

export async function fetchInventoryCostingSettingsApi(): Promise<InventoryCostingSettings> {
  requireLiveApi("Inventory costing settings");
  return apiRequest<InventoryCostingSettings>("/api/settings/inventory/costing");
}

export async function saveInventoryCostingSettingsApi(payload: Partial<InventoryCostingSettings>): Promise<void> {
  requireLiveApi("Save inventory costing settings");
  await apiRequest("/api/settings/inventory/costing", {
    method: "PATCH",
    body: payload,
  });
}
