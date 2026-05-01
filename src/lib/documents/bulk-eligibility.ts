import type { DocTypeKey } from "@/config/documents/types";

/** Mirrors backend `DOC_TYPE_REGISTRY` `requiresApproval` + `canPost` for bulk eligibility. */
export const DOC_BULK_POST_RULES: Record<
  DocTypeKey,
  { canPost: boolean; /** When true, only APPROVED rows may be posted (e.g. supplier bill). */ postOnlyWhenApproved: boolean }
> = {
  quote: { canPost: false, postOnlyWhenApproved: false },
  "sales-order": { canPost: false, postOnlyWhenApproved: false },
  "delivery-note": { canPost: false, postOnlyWhenApproved: false },
  invoice: { canPost: true, postOnlyWhenApproved: false },
  "credit-note": { canPost: true, postOnlyWhenApproved: false },
  "debit-note": { canPost: true, postOnlyWhenApproved: false },
  "purchase-request": { canPost: false, postOnlyWhenApproved: false },
  "purchase-order": { canPost: false, postOnlyWhenApproved: false },
  grn: { canPost: true, postOnlyWhenApproved: false },
  bill: { canPost: true, postOnlyWhenApproved: true },
  "purchase-credit-note": { canPost: true, postOnlyWhenApproved: false },
  "purchase-debit-note": { canPost: true, postOnlyWhenApproved: false },
  journal: { canPost: true, postOnlyWhenApproved: false },
};

export type BulkDocResultRow = { id: string; error?: string };

export function partitionBulkDocResults(results: BulkDocResultRow[]) {
  const failed = results.filter((r): r is BulkDocResultRow & { error: string } => !!r.error);
  const succeeded = results.filter((r) => !r.error);
  return { succeeded, failed };
}

export function filterIdsForBulkApprove<T extends { id: string; status: string }>(
  rows: T[],
  selectedIds: string[]
): string[] {
  const selected = new Set(selectedIds);
  return rows.filter((r) => selected.has(r.id) && r.status === "PENDING_APPROVAL").map((r) => r.id);
}

export function filterIdsForBulkPost<T extends { id: string; status: string }>(
  type: DocTypeKey,
  rows: T[],
  selectedIds: string[]
): string[] {
  const rule = DOC_BULK_POST_RULES[type];
  if (!rule?.canPost) return [];
  const selected = new Set(selectedIds);
  const terminal = new Set(["POSTED", "CANCELLED"]);
  return rows
    .filter((r) => {
      if (!selected.has(r.id)) return false;
      if (terminal.has(r.status)) return false;
      if (rule.postOnlyWhenApproved) return r.status === "APPROVED";
      return r.status === "DRAFT" || r.status === "APPROVED";
    })
    .map((r) => r.id);
}
