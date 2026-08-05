export type KraSigningStatus = "pending" | "signed" | "failed" | "skipped";

export type KraSigningRecord = {
  status: KraSigningStatus;
  cuInvoiceNumber?: string;
  verifyUrl?: string;
  cuSerialNumber?: string;
  signedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  incotexEndpoint?: string;
};

export const INCOTEX_SIGNABLE_DOC_TYPES = ["invoice", "credit-note", "debit-note"] as const;

export type IncotexSignableDocType = (typeof INCOTEX_SIGNABLE_DOC_TYPES)[number];

export function isIncotexSignableDocType(typeKey: string): typeKey is IncotexSignableDocType {
  return (INCOTEX_SIGNABLE_DOC_TYPES as readonly string[]).includes(typeKey);
}

export function kraSigningStatusLabel(status?: KraSigningStatus | null): string {
  switch (status) {
    case "pending":
      return "In queue";
    case "signed":
      return "Signed";
    case "failed":
      return "Declined";
    case "skipped":
      return "Skipped";
    default:
      return "Not sent";
  }
}

export function kraSigningStatusVariant(
  status?: KraSigningStatus | null
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "pending":
      return "warning";
    case "signed":
      return "success";
    case "failed":
      return "danger";
    case "skipped":
      return "default";
    default:
      return "default";
  }
}

/** Posted documents that can be (re)sent to KRA via Incotex. */
export function canRetryKraSigning(kraSigning?: KraSigningRecord | null): boolean {
  if (!kraSigning) return true;
  return kraSigning.status !== "signed";
}

export function kraRetryButtonLabel(kraSigning?: KraSigningRecord | null): string {
  if (!kraSigning) return "Send to KRA";
  if (kraSigning.status === "pending") return "Retry now";
  if (kraSigning.status === "failed") return "Retry";
  if (kraSigning.status === "skipped") return "Retry";
  return "Send to KRA";
}

export function docTypeLabel(typeKey: IncotexSignableDocType): string {
  switch (typeKey) {
    case "invoice":
      return "Invoice";
    case "credit-note":
      return "Credit note";
    case "debit-note":
      return "Debit note";
    default:
      return typeKey;
  }
}
