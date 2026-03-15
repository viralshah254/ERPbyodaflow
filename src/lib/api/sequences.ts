import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { SequenceRow } from "@/lib/mock/sequences";

type BackendSequence = {
  id: string;
  documentType: string;
  prefix?: string;
  nextNumber?: number;
  suffix?: string;
  padding?: number;
};

const DOC_TYPE_LABELS: Array<{ key: string; label: string }> = [
  { key: "quote", label: "Quote" },
  { key: "sales-order", label: "Sales Order" },
  { key: "delivery-note", label: "Delivery Note" },
  { key: "invoice", label: "Invoice" },
  { key: "purchase-request", label: "Purchase Request" },
  { key: "purchase-order", label: "Purchase Order" },
  { key: "grn", label: "Goods Receipt" },
  { key: "bill", label: "Bill" },
  { key: "journal", label: "Journal Entry" },
];

function toLabel(documentType: string): string {
  return DOC_TYPE_LABELS.find((entry) => entry.key === documentType)?.label ?? documentType;
}

function toKey(documentType: string): string {
  return DOC_TYPE_LABELS.find((entry) => entry.label === documentType)?.key ?? documentType;
}

function mapSequence(row: BackendSequence): SequenceRow {
  return {
    id: row.id,
    documentType: toLabel(row.documentType),
    prefix: row.prefix ?? "",
    nextNumber: row.nextNumber ?? 1,
    suffix: row.suffix ?? "",
    padding: row.padding ?? 4,
  };
}

export async function fetchSequencesApi(): Promise<SequenceRow[]> {
  requireLiveApi("Numbering sequences");
  const payload = await apiRequest<{ items: BackendSequence[] }>("/api/sequences");
  return (payload.items ?? []).map(mapSequence);
}

export async function saveSequenceApi(body: Omit<SequenceRow, "id">): Promise<void> {
  requireLiveApi("Save numbering sequence");
  await apiRequest("/api/sequences", {
    method: "POST",
    body: {
      documentType: toKey(body.documentType),
      prefix: body.prefix,
      nextNumber: body.nextNumber,
      suffix: body.suffix,
      padding: body.padding,
    },
  });
}
