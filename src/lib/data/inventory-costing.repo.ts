import type { LandedCostAllocationRequest } from "@/lib/api/landed-cost";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

export interface LandedCostAllocationRecord extends LandedCostAllocationRequest {
  id: string;
  postedAt: string;
}

export interface CostingRunRecord {
  id: string;
  period: string;
  status: "COMPLETED";
  completedAt: string;
}

const ALLOCATIONS_KEY = "odaflow_landed_cost_allocations";
const RUNS_KEY = "odaflow_inventory_costing_runs";

export function listLandedCostAllocations(): LandedCostAllocationRecord[] {
  return loadStoredValue(ALLOCATIONS_KEY, () => []);
}

export function saveLandedCostAllocation(body: LandedCostAllocationRequest): LandedCostAllocationRecord {
  const created: LandedCostAllocationRecord = {
    ...body,
    id: `lca-${Date.now()}`,
    postedAt: new Date().toISOString(),
  };
  saveStoredValue(ALLOCATIONS_KEY, [created, ...listLandedCostAllocations()]);
  return created;
}

export function listCostingRuns(): CostingRunRecord[] {
  return loadStoredValue(RUNS_KEY, () => []);
}

export function recordCostingRun(period: string): CostingRunRecord {
  const created: CostingRunRecord = {
    id: `costrun-${Date.now()}`,
    period,
    status: "COMPLETED",
    completedAt: new Date().toISOString(),
  };
  saveStoredValue(RUNS_KEY, [created, ...listCostingRuns()]);
  return created;
}

