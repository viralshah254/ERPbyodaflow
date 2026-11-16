"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  draftCreditForUncreditedReturnApi,
  fetchUncreditedRouteReturnsApi,
  type UncreditedReturnRow,
} from "@/lib/api/dispatch-warehouse";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { formatNairobiDate } from "@/lib/format/nairobi-datetime";

export default function UncreditedRouteReturnsPage() {
  const router = useRouter();
  const currency = useBaseCurrency();
  const [data, setData] = React.useState<{ since?: string; rows: UncreditedReturnRow[]; totalUncreditedValue: number } | null>(null);
  const [error, setError] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setError("");
    fetchUncreditedRouteReturnsApi()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load uncredited returns."));
  }, []);
  React.useEffect(load, [load]);

  async function draft(row: UncreditedReturnRow) {
    if (busyId) return;
    setBusyId(row.deliveryNoteId);
    try {
      const note = await draftCreditForUncreditedReturnApi(row.deliveryNoteId);
      toast.success(`Credit note ${note.number ?? ""} drafted. Review and post it.`);
      router.push(`/docs/credit-note/${encodeURIComponent(note.id)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft the credit note.");
      setBusyId(null);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Uncredited route returns"
        description="Goods drivers brought back from invoiced route loads that the customer is still being charged for."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Uncredited route returns" }]}
        sticky
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <Icons.RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {error}{" "}
            <Button variant="link" size="sm" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {data.rows.length ? `${data.rows.length} returns · ${formatMoney(data.totalUncreditedValue, currency)} still invoiced` : "Every route return is credited"}
            </CardTitle>
            <CardDescription>
              {data.since
                ? `Checked from the first route load on ${formatNairobiDate(data.since)}. `
                : "No route loads yet. "}
              Drafting a credit note only covers the quantity not already credited. Posting it moves the goods into the returns store at their original cost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.rows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Returned</TableHead>
                    <TableHead>Delivery note</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Items still invoiced</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.deliveryNoteId}>
                      <TableCell>{row.returnedAt ? formatNairobiDate(row.returnedAt) : "—"}</TableCell>
                      <TableCell>
                        <Link className="underline" href={`/docs/delivery-note/${encodeURIComponent(row.deliveryNoteId)}`}>
                          {row.deliveryNoteNumber ?? row.deliveryNoteId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link className="underline" href={`/docs/invoice/${encodeURIComponent(row.invoiceId)}`}>
                          {row.invoiceNumber ?? row.invoiceId}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.lines
                          .filter((line) => line.uncreditedQty > 0)
                          .map((line) => `${line.description ?? line.productId} × ${line.uncreditedQty}${line.condition === "DAMAGED" ? " (damaged)" : ""}`)
                          .join("; ")}
                        {row.creditNoteError ? <div className="text-xs text-destructive">{row.creditNoteError}</div> : null}
                        {row.creditNoteDraftNumbers.length ? (
                          <div className="text-xs text-muted-foreground">Draft waiting: {row.creditNoteDraftNumbers.join(", ")}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.uncreditedValue, currency)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={busyId !== null || row.creditNoteDraftNumbers.length > 0}
                          onClick={() => void draft(row)}
                        >
                          {busyId === row.deliveryNoteId ? "Drafting…" : "Draft credit note"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
