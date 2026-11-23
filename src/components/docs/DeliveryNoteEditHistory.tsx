"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchDeliveryNoteRevisionsApi, type DeliveryNoteRevision } from "@/lib/api/documents";
import { formatMoney } from "@/lib/money";

type Props = {
  deliveryNoteId: string;
  currency?: string;
  /** Changes whenever the delivery note is saved, so the history reloads. */
  refreshKey?: string;
};

function revisionTitle(row: DeliveryNoteRevision): string {
  if (row.kind === "ORIGINAL") return "Original delivery note";
  if (row.kind === "DISPATCH_AMEND") return `Edit ${row.revision} · dispatch amended`;
  return `Edit ${row.revision}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatQty(qty: number, unit?: string): string {
  return unit ? `${qty} ${unit}` : String(qty);
}

export function DeliveryNoteEditHistory({ deliveryNoteId, currency = "KES", refreshKey }: Props) {
  const [rows, setRows] = React.useState<DeliveryNoteRevision[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openLines, setOpenLines] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchDeliveryNoteRevisionsApi(deliveryNoteId)
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the edit history.");
      });
    return () => {
      cancelled = true;
    };
  }, [deliveryNoteId, refreshKey]);

  const newestFirst = React.useMemo(() => (rows ? [...rows].reverse() : []), [rows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icons.History className="h-4 w-4" />
          Edit history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!error && rows === null ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!error && rows?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This delivery note has not been edited. The first edit also keeps the original version here.
          </p>
        ) : null}
        {newestFirst.length ? (
          <ol className="space-y-3">
            {newestFirst.map((row) => {
              const linesOpen = openLines[row.id] ?? false;
              return (
                <li key={row.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{revisionTitle(row)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatWhen(row.editedAt)}
                      {row.editedByName ? ` · ${row.editedByName}` : ""}
                    </span>
                  </div>
                  {row.kind !== "ORIGINAL" ? (
                    <p className="mt-1">
                      <span className="text-muted-foreground">Reason: </span>
                      {row.reason?.trim() || <span className="italic text-muted-foreground">No reason given</span>}
                    </p>
                  ) : null}
                  {row.changes.length ? (
                    <ul className="mt-2 space-y-0.5">
                      {row.changes.map((change, index) => (
                        <li key={`${row.id}-${index}`} className="text-xs">
                          <span className="font-medium">{change.field}</span>
                          {change.from !== undefined ? <>: {change.from}</> : null}
                          {change.from !== undefined && change.to !== undefined ? " → " : change.to !== undefined ? ": " : null}
                          {change.to !== undefined ? change.to : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs"
                    onClick={() => setOpenLines((prev) => ({ ...prev, [row.id]: !linesOpen }))}
                  >
                    {linesOpen ? "Hide lines" : `Show lines in this version (${row.lines.length})`}
                  </Button>
                  {linesOpen ? (
                    <table className="mt-2 w-full text-xs">
                      <tbody>
                        {row.lines.map((line) => (
                          <tr key={line.lineId} className="border-t">
                            <td className="py-1 pr-2">{line.name}</td>
                            <td className="py-1 pr-2 text-right tabular-nums">{formatQty(line.quantity, line.unit)}</td>
                            <td className="py-1 text-right tabular-nums">
                              {typeof line.amount === "number" ? formatMoney(line.amount, currency) : "—"}
                            </td>
                          </tr>
                        ))}
                        {typeof row.total === "number" ? (
                          <tr className="border-t font-medium">
                            <td className="py-1" colSpan={2}>Total</td>
                            <td className="py-1 text-right tabular-nums">{formatMoney(row.total, currency)}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}
