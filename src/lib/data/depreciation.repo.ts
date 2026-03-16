import type { DepreciationRunPreview } from "@/lib/types/depreciation";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

export interface DepreciationRunRecord {
  id: string;
  period: string;
  totalDepreciation: number;
  createdAt: string;
}

const KEY = "odaflow_depreciation_runs";

export function listDepreciationRuns(): DepreciationRunRecord[] {
  return loadStoredValue(KEY, () => []);
}

export function recordDepreciationRun(preview: DepreciationRunPreview): DepreciationRunRecord {
  const created: DepreciationRunRecord = {
    id: `depr-${Date.now()}`,
    period: preview.period,
    totalDepreciation: preview.totalDepreciation,
    createdAt: new Date().toISOString(),
  };
  saveStoredValue(KEY, [created, ...listDepreciationRuns()]);
  return created;
}

