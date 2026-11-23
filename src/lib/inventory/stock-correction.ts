import { canonicalIndustryTemplateId, FMCG_BAKERY_TEMPLATE_ID } from "@/config/industry";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { useOrgContextStore } from "@/stores/orgContextStore";
import type { StockCorrectionReasonCode } from "@/lib/api/inventory-stock";

export const STOCK_CORRECTION_HREF = "/inventory/stock-corrections";

/** Words people type when stock on the shelf no longer matches the system. */
export const STOCK_CORRECTION_KEYWORDS = [
  "adjust stock", "stock adjustment", "stock issue", "stock correction", "correct stock",
  "broken", "breakage", "damaged", "spoiled", "expired", "missing", "lost", "stolen",
  "recovery", "write off", "recount", "count difference", "found stock",
];

export const STOCK_CORRECTION_REASON_HINTS: Record<StockCorrectionReasonCode, { label: string; direction: "reduce" | "increase" | "count" }> = {
  BREAKAGE: { label: "Broken or damaged", direction: "reduce" },
  SPOILED: { label: "Expired or spoiled", direction: "reduce" },
  MISSING: { label: "Missing or stolen", direction: "reduce" },
  RECOUNT: { label: "Physical count differs", direction: "count" },
  FOUND: { label: "Found stock", direction: "increase" },
  OTHER: { label: "Other", direction: "count" },
};

/**
 * Bakery orgs: manual stock changes are admin-only corrections with a reason.
 * Everyone else keeps the normal stock adjustment on Stock levels.
 */
export function useStockCorrectionAccess() {
  const templateId = useOrgContextStore((s) => s.templateId);
  const isAdmin = useHasPermission("admin.settings");
  const controlled = canonicalIndustryTemplateId(templateId) === FMCG_BAKERY_TEMPLATE_ID;
  return { controlled, isAdmin, canCorrect: controlled && isAdmin };
}

/** Change to post, from what the system holds and what the person entered. */
export function correctionDelta(direction: "reduce" | "increase" | "count", systemQty: number, entered: number): number {
  if (!Number.isFinite(entered) || entered < 0) return 0;
  if (direction === "reduce") return -entered;
  if (direction === "increase") return entered;
  return Math.round((entered - systemQty) * 10000) / 10000;
}
