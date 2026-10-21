import type { AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import type { DocTypeKey } from "@/config/documents/types";
import { fetchCrmAccountsApi } from "@/lib/api/crm";
import { fetchDocumentDetailApi, fetchDocumentListPageApi } from "@/lib/api/documents";
import { formatMoney } from "@/lib/money";
import type { DocListRow } from "@/lib/types/documents";

const createdAtByDocumentId = new Map<string, string>();

const nairobiDateTime = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "Africa/Nairobi",
});

const nairobiDate = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

const nairobiClock = new Intl.DateTimeFormat("en-KE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "Africa/Nairobi",
});

const nairobiDayKey = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Africa/Nairobi",
});

function documentWhen(row: DocListRow): string {
  const created = row.createdAt ? new Date(String(row.createdAt)) : null;
  const hasCreated = Boolean(created && !Number.isNaN(created.getTime()));
  const orderDay = row.date ? String(row.date).slice(0, 10) : "";
  if (!hasCreated || !created) return orderDay;
  if (!orderDay || orderDay === nairobiDayKey.format(created)) return nairobiDateTime.format(created);
  const orderDate = new Date(`${orderDay}T12:00:00+03:00`);
  const orderLabel = Number.isNaN(orderDate.getTime()) ? orderDay : nairobiDate.format(orderDate);
  return `${orderLabel}, ${nairobiClock.format(created)}`;
}

async function rowWithCreatedAt(type: DocTypeKey, row: DocListRow): Promise<DocListRow> {
  if (row.createdAt) return row;
  const cached = createdAtByDocumentId.get(row.id);
  if (cached) return { ...row, createdAt: cached };
  const detail = await fetchDocumentDetailApi(type, row.id, { include: ["core"] }).catch(() => null);
  const createdAt = detail?.createdAt;
  if (!createdAt) return row;
  createdAtByDocumentId.set(row.id, createdAt);
  return { ...row, createdAt };
}

export function documentSelectOption(row: DocListRow): AsyncSearchableSelectOption {
  const amount = typeof row.total === "number" ? formatMoney(row.total, row.currency || "KES") : "";
  const when = documentWhen(row);
  return {
    id: row.id,
    label: [row.number, row.party].filter(Boolean).join(" · "),
    description: [when, amount].filter(Boolean).join(" · "),
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
  for (let index = 0; index < types.length; index += 1) {
    const type = types[index];
    const rows = await Promise.all((pages[index]?.items ?? []).map((row) => rowWithCreatedAt(type, row)));
    for (const row of rows) {
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
