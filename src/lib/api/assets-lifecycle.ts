import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type DepreciationPreviewRow = {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
};

export type DepreciationPreview = {
  periodKey: string;
  lines: DepreciationPreviewRow[];
  totalDepreciation: number;
};

export type DepreciationRunRow = {
  id: string;
  runDate: string;
  periodKey: string;
  journalId?: string;
  totalDepreciation: number;
};

export async function fetchDepreciationPreviewApi(periodKey: string): Promise<DepreciationPreview> {
  requireLiveApi("Depreciation preview");
  const params = new URLSearchParams();
  params.set("periodKey", periodKey);
  return apiRequest<DepreciationPreview>("/api/assets/depreciation/preview", { params });
}

export async function runDepreciationApi(periodKey: string): Promise<{ runId: string; assetCount: number; periodKey: string }> {
  requireLiveApi("Run depreciation");
  return apiRequest<{ runId: string; assetCount: number; periodKey: string }>("/api/assets/depreciation/run", {
    method: "POST",
    body: { periodKey },
  });
}

export async function fetchDepreciationRunsApi(): Promise<DepreciationRunRow[]> {
  requireLiveApi("Depreciation runs");
  const payload = await apiRequest<{
    items: Array<{
      id: string;
      runDate: string;
      periodKey: string;
      journalId?: string;
      lines?: Array<{ amount: number }>;
    }>;
  }>("/api/assets/depreciation");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    runDate: item.runDate?.slice(0, 10) ?? "",
    periodKey: item.periodKey,
    journalId: item.journalId,
    totalDepreciation: (item.lines ?? []).reduce((sum, line) => sum + (line.amount ?? 0), 0),
  }));
}

export async function postDisposalJournalApi(id: string): Promise<{ journalId: string }> {
  requireLiveApi("Post disposal journal");
  return apiRequest<{ journalId: string }>(`/api/assets/disposals/${encodeURIComponent(id)}/post-journal`, {
    method: "POST",
    body: {},
  });
}
