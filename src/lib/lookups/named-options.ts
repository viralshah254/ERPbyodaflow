import type { AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import type { DocTypeKey } from "@/config/documents/types";
import { fetchCrmAccountsApi } from "@/lib/api/crm";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { formatMoney } from "@/lib/money";
import type { DocListRow } from "@/lib/types/documents";

export function documentSelectOption(row: DocListRow): AsyncSearchableSelectOption {
  const amount = typeof row.total === "number" ? formatMoney(row.total, row.currency || "KES") : "";
  const date = row.date ? String(row.date).slice(0, 10) : "";
  return {
    id: row.id,
    label: [row.number, row.party, date, amount].filter(Boolean).join(" · "),
  };
}

export async function searchDocumentOptions(
  types: DocTypeKey[],
  query: string
): Promise<AsyncSearchableSelectOption[]> {
  const pages = await Promise.all(
    types.map((type) => fetchDocumentListPageApi(type, { search: query, limit: 15 }).catch(() => null))
  );
  const seen = new Set<string>();
  const options: AsyncSearchableSelectOption[] = [];
  for (const page of pages) {
    for (const row of page?.items ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      options.push(documentSelectOption(row));
    }
  }
  return options;
}

export async function searchCrmAccountOptions(query: string): Promise<AsyncSearchableSelectOption[]> {
  const rows = await fetchCrmAccountsApi(query);
  return rows.map((row) => ({
    id: row.id,
    label: [row.name, row.code].filter(Boolean).join(" · "),
    description: [row.phone, row.email].filter(Boolean).join(" · ") || undefined,
  }));
}
