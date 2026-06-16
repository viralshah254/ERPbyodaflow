import type { DocumentDetailRecord } from "@/lib/types/documents";

type CreatedBySource = Pick<
  DocumentDetailRecord,
  "createdByName" | "auditHistory" | "approvalHistory"
>;

/** Resolve document creator display name from API field or audit/approval timeline. */
export function resolveDocumentCreatedByName(doc: CreatedBySource | null | undefined): string | undefined {
  if (!doc) return undefined;
  if (doc.createdByName?.trim()) return doc.createdByName.trim();

  const audit = doc.auditHistory ?? [];
  const createdEntry = [...audit]
    .filter((entry) => /\bcreated\b/i.test(entry.action))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
  if (createdEntry?.by?.trim()) return createdEntry.by.trim();

  const approvals = doc.approvalHistory ?? [];
  const submittedEntry = approvals.find((entry) => /submitted for approval/i.test(entry.action));
  if (submittedEntry?.by?.trim()) return submittedEntry.by.trim();

  const approvedWithRequester = approvals.find((entry) => entry.requesterBy?.trim());
  if (approvedWithRequester?.requesterBy?.trim()) return approvedWithRequester.requesterBy.trim();

  return undefined;
}
