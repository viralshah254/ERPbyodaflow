"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  fetchMpesaUnmatchedPayments,
  matchMpesaPayment,
  type MpesaUnmatchedPayment,
} from "@/lib/api/coolcatch-gap";
import { COOLCATCH_HQ_ORG_ID } from "@/lib/coolcatch/constants";
import { toast } from "sonner";

function formatMoney(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amount);
}

export default function FinanceMpesaReconPage() {
  const [items, setItems] = React.useState<MpesaUnmatchedPayment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [matching, setMatching] = React.useState(false);
  const [selected, setSelected] = React.useState<MpesaUnmatchedPayment | null>(null);
  const [documentId, setDocumentId] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchMpesaUnmatchedPayments());
    } catch (e) {
      toast.error((e as Error).message || "Failed to load M-Pesa payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleMatch = async () => {
    if (!selected) return;
    const docId = documentId.trim();
    if (!docId) {
      toast.error("Enter the sales order or invoice document id to match.");
      return;
    }
    setMatching(true);
    try {
      await matchMpesaPayment(selected.id, docId);
      toast.success("M-Pesa payment matched.");
      setSelected(null);
      setDocumentId("");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || "Match failed.");
    } finally {
      setMatching(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="M-Pesa Till Reconciliation"
        description="Match unmatched till / C2B payments to sales documents for Cool Catch HQ."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "M-Pesa Till Reconciliation" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/bank-recon">Bank reconciliation</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cool Catch HQ till queue</CardTitle>
            <CardDescription>
              Unmatched C2B/STK callbacks for org{" "}
              <code className="text-xs">{COOLCATCH_HQ_ORG_ID}</code>. Match each payment to the
              correct sales order or invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading queue…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No unmatched M-Pesa payments in the queue.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(row.transactedAt).toLocaleString("en-KE")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.transactionId}</TableCell>
                      <TableCell>{row.phone ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(row.amount, row.currency ?? "KES")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(row);
                            setDocumentId("");
                          }}
                        >
                          Match
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Match M-Pesa payment</SheetTitle>
            <SheetDescription>
              Link this till payment to the sale document that received the funds.
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="space-y-4 py-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Transaction:</span>{" "}
                  <span className="font-mono">{selected.transactionId}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  {formatMoney(selected.amount, selected.currency ?? "KES")}
                </p>
                {selected.phone ? (
                  <p>
                    <span className="text-muted-foreground">Phone:</span> {selected.phone}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-document-id">Sales document id</Label>
                <Input
                  id="match-document-id"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Paste sales order or invoice id"
                />
              </div>
            </div>
          ) : null}
          <SheetFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={matching}>
              Cancel
            </Button>
            <Button onClick={() => void handleMatch()} disabled={matching || !selected}>
              {matching ? "Matching…" : "Confirm match"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
