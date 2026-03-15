import type { ErpSearchHit } from "@/lib/api/erp-search";

export type CopilotBlock =
  | { type: "narrative"; text: string }
  | { type: "kpi"; title: string; value: number; unit?: string; trend?: { label: string; value: number } }
  | { type: "table"; title?: string; columns: string[]; rows: Array<Record<string, string | number | null>> }
  | { type: "chart"; title: string; chartKind: "line" | "bar"; series: Array<{ name: string; points: Array<{ x: string; y: number }> }> }
  | { type: "links"; title?: string; items: Array<{ label: string; href: string }> }
  | { type: "proposed_action"; actionId: string; actionType: string; summary: string; payload: Record<string, unknown>; requiresConfirmation: boolean }
  | { type: "execution_status"; status: "pending_confirmation" | "success" | "failed"; message: string };

export interface CopilotPayload {
  mode: "copilot";
  intent: string;
  confidence: number;
  summary: string;
  requiresConfirmation: boolean;
  traceId: string;
  blocks: CopilotBlock[];
  suggestions: string[];
}

export interface CopilotContext {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  role?: string;
}

export interface CopilotResponse {
  query: string;
  summary: string;
  topIntent: "search" | "document_lookup" | "party_lookup" | "product_lookup" | "inventory_lookup";
  hits: ErpSearchHit[];
  suggestions: string[];
  copilot?: CopilotPayload;
}
