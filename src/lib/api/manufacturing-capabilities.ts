import { apiRequest, getApiBase } from "./client";
export type ManufacturingCapabilities = { version: string; reports?: string; availability?: string; preparation?: string; outputActuals?: string; floorMaterials?: string; operations?: string; yieldPolicy?: string; productionPlan?: string; revision: string };
export async function requireManufacturingCapability(capability: "reports" | "availability" | "preparation" | "outputActuals" | "floorMaterials" | "operations" | "yieldPolicy" | "productionPlan", expected: string) {
  let capabilities: ManufacturingCapabilities;
  try { capabilities = await apiRequest<ManufacturingCapabilities>("/api/manufacturing/capabilities"); }
  catch (error) {
    if ((error as { status?: number }).status === 404) throw new Error(`The connected API (${getApiBase()}) does not expose manufacturing capabilities. Update the backend before using this workflow.`);
    throw error;
  }
  if (capabilities.version !== "manufacturing-capabilities-v1" || capabilities[capability] !== expected) throw new Error(`Unsupported manufacturing capability: ${capability}. API ${getApiBase()}, revision ${capabilities.revision || "unknown"}. Update the backend before continuing.`);
  return capabilities;
}
