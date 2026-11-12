"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchExpectedEmailOrdersApi,
  fetchExpectedEmailOrdersSummaryApi,
  fetchSuggestedOrdersForExpectedApi,
  linkExpectedEmailOrderApi,
  type ExpectedEmailOrderRow,
} from "@/lib/api/expected-email-orders";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function statusVariant(status: ExpectedEmailOrderRow["displayStatus"]) {
  switch (status) {
    case "OVERDUE":
      return "destructive" as const;
    case "RECEIVED":
      return "default" as const;
    case "SENT":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function roleLabel(role: ExpectedEmailOrderRow["reportedByRole"]) {
  switch (role) {
    case "merchandiser":
      return "Merchandiser";
    case "supervisor":
      return "Supervisor";
    case "sales_rep":
      return "Sales rep";
  }
}

function formatWhen(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ExpectedEmailOrdersPanel() {
  const [rows, setRows] = React.useState<ExpectedEmailOrderRow[]>([]);
  const [summary, setSummary] = React.useState<{ overdueCount: number; pendingCount: number } | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "open" | "overdue">("open");
  const [linkingId, setLinkingId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<
    Record<string, Awaited<ReturnType<typeof fetchSuggestedOrdersForExpectedApi>>>
  >({});

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [items, sum] = await Promise.all([
        fetchExpectedEmailOrdersApi({
          unlinkedOnly: filter !== "all",
          overdueOnly: filter === "overdue",
        }),
        fetchExpectedEmailOrdersSummaryApi(),
      ]);
      setRows(items);
      setSummary(sum);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load expected email orders.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.customerName,
        row.branchName ?? "",
        row.reportedByName,
        row.reportedByPhone ?? "",
        row.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const openLink = async (row: ExpectedEmailOrderRow) => {
    setLinkingId(row.id);
    try {
      if (!suggestions[row.id]) {
        const items = await fetchSuggestedOrdersForExpectedApi(row.id);
        setSuggestions((prev) => ({ ...prev, [row.id]: items }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load order suggestions.");
      setLinkingId(null);
    }
  };

  const confirmLink = async (expectedId: string, salesOrderId: string) => {
    try {
      const result = await linkExpectedEmailOrderApi(expectedId, salesOrderId);
      toast.success(
        result.salesOrderNumber
          ? `Linked to ${result.salesOrderNumber}.`
          : "Linked to sales order."
      );
      setLinkingId(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not link order.");
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Expected email orders</h3>
          <p className="text-xs text-muted-foreground">
            Field visits where the customer will email an LPO — link to the sales order when it arrives.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary ? (
            <>
              {summary.overdueCount > 0 ? (
                <Badge variant="destructive">{summary.overdueCount} overdue</Badge>
              ) : null}
              {summary.pendingCount > 0 ? (
                <Badge variant="secondary">{summary.pendingCount} waiting</Badge>
              ) : null}
            </>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            <Icons.RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["open", "overdue", "all"] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {key === "open" ? "Open" : key === "overdue" ? "Overdue" : "All"}
          </Button>
        ))}
        <Input
          className="ml-auto max-w-xs"
          placeholder="Search customer, branch, rep…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="Mail"
          title="No expected email orders"
          description={
            filter === "overdue"
              ? "No overdue expectations right now."
              : "Merchandisers and sales reps will appear here when they mark a visit expecting an emailed LPO."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium leading-snug">
                    {row.branchName ? `${row.customerName} · ${row.branchName}` : row.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(row.reportedByRole)} · {row.reportedByName}
                    {row.reportedByPhone ? ` · ${row.reportedByPhone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recorded {formatWhen(row.createdAt)}
                    {row.expectedBy ? ` · Expected by ${formatWhen(row.expectedBy)}` : ""}
                    {row.sentAt ? ` · Marked sent ${formatWhen(row.sentAt)}` : ""}
                  </p>
                  {row.notes ? (
                    <p className="text-sm text-muted-foreground mt-2">{row.notes}</p>
                  ) : null}
                </div>
                <Badge variant={statusVariant(row.displayStatus)}>{row.displayStatus}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {row.linkedSalesOrderId ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/docs/sales-order/${row.linkedSalesOrderId}`}>View sales order</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => void openLink(row)}>
                    Link LPO
                  </Button>
                )}
              </div>

              {linkingId === row.id ? (
                <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Suggested sales orders</p>
                  {(suggestions[row.id] ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No matching orders yet — check the sync queue or document hub, then link manually from
                      the order detail page.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(suggestions[row.id] ?? []).map((so) => (
                        <li
                          key={so.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <span>
                            {so.number ?? so.id}
                            {so.purchaseOrderNumber ? ` · PO ${so.purchaseOrderNumber}` : ""}
                            {so.partyName ? ` · ${so.partyName}` : ""}
                          </span>
                          <Button size="sm" onClick={() => void confirmLink(row.id, so.id)}>
                            Link
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setLinkingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
