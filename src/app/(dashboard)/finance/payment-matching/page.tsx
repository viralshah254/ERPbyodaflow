"use client";

import * as React from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import type { BankAccountRow } from "@/lib/types/treasury";
import {
  confirmPaymentMatchApi,
  describeMatchingRun,
  fetchMatchingAccuracyApi,
  fetchMatchSuggestionsApi,
  fetchPaymentMatchingSettingsApi,
  runPaymentMatchingApi,
  savePaymentMatchingSettingsApi,
  type MatchingAccuracy,
  type MatchingMode,
  type MatchSuggestionRow,
  type PaymentMatchingSettings,
} from "@/lib/api/payment-matching";
import { Input } from "@/components/ui/input";
import { JOY_BAKERS_ORG_ID } from "@/lib/api/joy-route-orders";
import { useAuthStore } from "@/stores/auth-store";
import { formatMoney } from "@/lib/money";

const MODES: Array<{ mode: MatchingMode; label: string; hint: string }> = [
  { mode: "OFF", label: "Off", hint: "Nothing is matched on its own." },
  { mode: "SHADOW", label: "Practice", hint: "Scores every line and records what it would post. People still post. Start here." },
  { mode: "AUTO", label: "Automatic", hint: "Posts clear matches at or above the confidence below. Everything else waits for review." },
];

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function PaymentMatchingPage() {
  const isJoyBakers = useAuthStore((state) => state.org?.orgId === JOY_BAKERS_ORG_ID);
  const [review, setReview] = React.useState<{ id: string; note: string }>();
  const [settings, setSettings] = React.useState<PaymentMatchingSettings | null>(null);
  const [accuracy, setAccuracy] = React.useState<MatchingAccuracy | null>(null);
  const [accounts, setAccounts] = React.useState<BankAccountRow[]>([]);
  const [accountId, setAccountId] = React.useState("");
  const [rows, setRows] = React.useState<MatchSuggestionRow[]>([]);
  const [rowsError, setRowsError] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchPaymentMatchingSettingsApi().then(setSettings).catch((e) => toast.error(e instanceof Error ? e.message : "Could not load settings."));
    fetchMatchingAccuracyApi().then(setAccuracy).catch(() => setAccuracy(null));
    fetchBankAccountsApi()
      .then((list) => {
        setAccounts(list);
        if (list[0]) setAccountId((prev) => prev || list[0]!.id);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load bank accounts."));
  }, []);

  const loadRows = React.useCallback((id: string) => {
    if (!id) return;
    setRowsError("");
    fetchMatchSuggestionsApi(id)
      .then(setRows)
      .catch((e) => {
        setRows([]);
        setRowsError(e instanceof Error ? e.message : "Could not load suggestions.");
      });
  }, []);
  React.useEffect(() => loadRows(accountId), [accountId, loadRows]);

  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "KES";

  async function saveSettings(next: PaymentMatchingSettings) {
    setBusy("settings");
    try {
      setSettings(await savePaymentMatchingSettingsApi(next));
      toast.success("Payment matching saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  async function run() {
    if (!accountId) return;
    setBusy("run");
    try {
      const result = await runPaymentMatchingApi(accountId);
      toast.success(describeMatchingRun(result) || "Matching is off.");
      result.errors.slice(0, 3).forEach((err) => toast.error(err));
      loadRows(accountId);
      fetchMatchingAccuracyApi().then(setAccuracy).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Matching failed.");
    } finally {
      setBusy(null);
    }
  }

  async function confirm(row: MatchSuggestionRow) {
    setBusy(row._id);
    try {
      await confirmPaymentMatchApi({ lineId: row.statementLineId, candidateType: row.candidateType, candidateId: row.candidateId, reviewNote: review?.id === row._id ? review.note.trim() : undefined });
      setReview(undefined);
      toast.success(`Posted against ${row.candidateNumber ?? row.candidateId}.`);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
      fetchMatchingAccuracyApi().then(setAccuracy).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post the match.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Payment matching"
        description="Matches bank, M-Pesa and cheque lines to customer invoices and recorded receipts, and learns who pays for whom."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Payment matching" }]}
        sticky
      />
      <div className="space-y-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How matching runs</CardTitle>
              <CardDescription>Runs after every statement import and when you press Auto-match in Bank reconciliation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MODES.map((option) => (
                      <button
                        key={option.mode}
                        type="button"
                        disabled={busy === "settings"}
                        onClick={() => void saveSettings({ ...settings, mode: option.mode })}
                        className={`rounded-md border p-3 text-left ${settings.mode === option.mode ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                      >
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.hint}</p>
                      </button>
                    ))}
                  </div>
                  <div className="max-w-xs space-y-1">
                    <Label htmlFor="threshold">Post on its own at confidence of</Label>
                    {isJoyBakers && <p className="text-xs text-muted-foreground">M-Pesa matches below 99% always require review.</p>}
                    <select
                      id="threshold"
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={String(settings.autoPostThreshold)}
                      disabled={busy === "settings"}
                      onChange={(e) => void saveSettings({ ...settings, autoPostThreshold: Number(e.target.value) })}
                    >
                      {[0.95, 0.97, 0.99, 0.995, 0.999].map((value) => (
                        <option key={value} value={String(value)}>{pct(value)} or more</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Only exact amounts that settle the invoice in full, with no close second candidate, are ever posted on their own.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Track record</CardTitle>
              <CardDescription>Check this before switching from practice to automatic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {!accuracy ? (
                <p className="text-muted-foreground">No results yet.</p>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Suggestions made</span><span>{accuracy.suggestions}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Posted on its own</span><span>{accuracy.autoPosted}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Accepted by a person</span><span>{accuracy.confirmed}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Overruled by a person</span><span>{accuracy.rejected}</span></div>
                  <div className="flex justify-between font-semibold">
                    <span>Right when it would have posted</span>
                    <span>{accuracy.highConfidenceAccuracy == null ? "—" : `${accuracy.highConfidenceAccuracy}% of ${accuracy.highConfidenceDecided}`}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-end justify-between gap-4">
            <div>
              <CardTitle className="text-base">Waiting for review</CardTitle>
              <CardDescription>Best candidate for each unmatched line, with the reasons.</CardDescription>
            </div>
            <div className="flex items-end gap-2">
              <select
                aria-label="Bank or M-Pesa account"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>
                ))}
              </select>
              <Button size="sm" onClick={() => void run()} disabled={!accountId || busy === "run"}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                {busy === "run" ? "Matching…" : "Match now"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {rowsError ? (
              <p className="p-4 text-sm text-destructive">{rowsError}</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nothing waiting. Import a statement or press Match now.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Best match</TableHead>
                    <TableHead>Why</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell className="tabular-nums">{formatMoney(row.amount, currency)}</TableCell>
                      <TableCell>
                        {row.candidateType === "invoice" ? "Invoice" : "Receipt"} {row.candidateNumber ?? row.candidateId}
                      </TableCell>
                      <TableCell className="space-y-1 text-xs text-muted-foreground">
                        <p>{row.signals.map((s) => s.label).join(" · ")}</p>
                        {row.review && (
                          <>
                            <p className="font-medium text-foreground">{row.review.reason}</p>
                            <p>{[
                              row.review.statementReference && `Receipt ${row.review.statementReference}`,
                              row.review.statementTill && `Statement till ${row.review.statementTill}`,
                              row.review.expectedTill && `Invoice till ${row.review.expectedTill}`,
                            ].filter(Boolean).join(" · ")}</p>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.review ? `${(row.score * 100).toFixed(2)}%` : pct(row.score)}
                        {row.runnerUpScore ? <span className="block text-xs text-muted-foreground">next {pct(row.runnerUpScore)}</span> : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.review && review?.id === row._id ? (
                          <div className="ml-auto grid max-w-xs gap-2 text-left">
                            <Label htmlFor={`review-${row._id}`}>What did you verify?</Label>
                            <Input id={`review-${row._id}`} maxLength={500} value={review.note} disabled={busy === row._id}
                              onChange={(event) => setReview({ id: row._id, note: event.target.value })} />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" disabled={busy === row._id} onClick={() => setReview(undefined)}>Cancel</Button>
                              <Button size="sm" disabled={!review.note.trim() || busy === row._id} onClick={() => void confirm(row)}>
                                Confirm and post
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busy === row._id}
                            onClick={() => row.review ? setReview({ id: row._id, note: "" }) : void confirm(row)}>
                            {row.review ? "Review" : "Post"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
