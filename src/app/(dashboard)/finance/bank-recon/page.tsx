"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  autoMatchBankReconApi,
  createBankReconAdjustingEntryApi,
  createBankReconPaymentFromStatementApi,
  fetchBankReconOpenItemsApi,
  fetchBankReconSnapshotApi,
  fetchBankReconSuggestionsApi,
  matchBankReconLinesApi,
  matchBankReconToDocumentApi,
  type BankReconOpenItemSuggestion,
  type BankStatementLine,
  type BankReconSnapshot,
  type SystemTransaction,
} from "@/lib/api/bank-recon";
import { searchApSupplierOptionsApi, searchArCustomerOptionsApi } from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";

function formatMoney(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function BankReconPage() {
  const baseCurrency = useBaseCurrency();
  const router = useRouter();
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const [bankAccountId, setBankAccountId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [snapshot, setSnapshot] = React.useState<BankReconSnapshot | null>(null);
  const [selectedStmt, setSelectedStmt] = React.useState<string | null>(null);
  const [selectedSys, setSelectedSys] = React.useState<string | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importAccountId, setImportAccountId] = React.useState("");
  const [autoMatching, setAutoMatching] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<BankReconOpenItemSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [matchingDocId, setMatchingDocId] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [pendingLine, setPendingLine] = React.useState<BankStatementLine | null>(null);
  const [counterpartyId, setCounterpartyId] = React.useState("");
  const [selectedCounterpartyOption, setSelectedCounterpartyOption] = React.useState<PartyLookupOption | null>(null);
  const [openItems, setOpenItems] = React.useState<Array<{ id: string; number: string; outstanding: number; currency?: string }>>([]);
  const [openItemAllocations, setOpenItemAllocations] = React.useState<Record<string, number>>({});
  const [creatingAdjusting, setCreatingAdjusting] = React.useState(false);

  const refreshSnapshot = React.useCallback(async (accountId?: string) => {
    setLoading(true);
    try {
      const data = await fetchBankReconSnapshotApi(accountId || undefined);
      setSnapshot(data);
      if (!accountId && data.bankAccounts[0]?.id) {
        setBankAccountId(data.bankAccounts[0].id);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshSnapshot(bankAccountId || undefined);
  }, [bankAccountId, refreshSnapshot]);

  React.useEffect(() => {
    if (!selectedStmt) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetchBankReconSuggestionsApi(selectedStmt)
      .then((items) => {
        if (!cancelled) setSuggestions(items);
      })
      .catch((e) => {
        if (!cancelled) toast.error((e as Error).message || "Failed to load match suggestions.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStmt]);

  const session = snapshot?.session;
  const statements = snapshot?.statements ?? [];
  const systemTxns = snapshot?.systemTxns ?? [];
  const currency = session?.statementCurrency ?? baseCurrency;

  const unmatchedStmt = statements.filter((s) => s.status !== "MATCHED");
  const unmatchedSys = systemTxns.filter((t) => !t.matchedId);

  const selectedLine = statements.find((line) => line.id === selectedStmt) ?? null;

  const handleAutoMatch = async () => {
    if (!bankAccountId) {
      toast.error("Select a bank account first.");
      return;
    }
    setAutoMatching(true);
    try {
      const result = await autoMatchBankReconApi(bankAccountId);
      toast.success(`Auto-matched ${result.matched} line(s). ${result.unmatched} still unmatched.`);
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Auto-match failed.");
    } finally {
      setAutoMatching(false);
    }
  };

  const handleMatchToDocument = async (documentId: string) => {
    if (!selectedStmt) return;
    setMatchingDocId(documentId);
    try {
      const result = await matchBankReconToDocumentApi(selectedStmt, documentId);
      toast.success(`Matched to ${result.number}.`);
      setSelectedStmt(null);
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Match failed.");
    } finally {
      setMatchingDocId(null);
    }
  };

  const handleCreateAdjustingEntry = async () => {
    if (!selectedStmt) {
      toast.error("Select an unmatched statement line first.");
      return;
    }
    setCreatingAdjusting(true);
    try {
      const { journalId } = await createBankReconAdjustingEntryApi(selectedStmt);
      toast.success("Draft adjustment journal created.");
      await refreshSnapshot(bankAccountId);
      setSelectedStmt(null);
      router.push(`/docs/journal/${journalId}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreatingAdjusting(false);
    }
  };

  React.useEffect(() => {
    if (!createOpen || !pendingLine || !counterpartyId) {
      setOpenItems([]);
      setOpenItemAllocations({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const items = await fetchBankReconOpenItemsApi({
        direction: pendingLine.amount >= 0 ? "AR" : "AP",
        partyId: counterpartyId,
      });
      if (!cancelled) {
        setOpenItems(
          items.map((item) => ({
            id: item.id,
            number: item.number,
            outstanding: item.outstanding,
            currency: item.currency,
          }))
        );
      }
    };
    void load().catch((e) => {
      if (!cancelled) toast.error((e as Error).message || "Failed to load open items.");
    });
    return () => {
      cancelled = true;
    };
  }, [createOpen, pendingLine, counterpartyId]);

  const handleCreatePayment = (line: BankStatementLine) => {
    setPendingLine(line);
    setCounterpartyId("");
    setSelectedCounterpartyOption(null);
    setOpenItems([]);
    setOpenItemAllocations({});
    setCreateOpen(true);
  };

  const handleCreatePaymentSubmit = async () => {
    if (!pendingLine || !counterpartyId) {
      toast.error("Select a counterparty first.");
      return;
    }
    setCreating(true);
    try {
      const allocations = Object.entries(openItemAllocations)
        .filter(([, amount]) => amount > 0)
        .map(([documentId, amount]) => ({ documentId, amount }));
      const result = await createBankReconPaymentFromStatementApi(pendingLine, counterpartyId, allocations);
      toast.success(`Created and matched payment ${result.number}.`);
      setCreateOpen(false);
      setPendingLine(null);
      setCounterpartyId("");
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Failed to create payment.");
    } finally {
      setCreating(false);
    }
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const accountId = importAccountId || bankAccountId;
    if (!accountId) {
      toast.error("Select a bank account before importing.");
      return;
    }
    uploadFile(
      "/api/import/bank-statement",
      file,
      (data) => {
        if (data.imported != null) toast.success(`Imported ${data.imported} line(s).`);
        else toast.success("Import completed.");
        setImportOpen(false);
        setBankAccountId(accountId);
        void refreshSnapshot(accountId);
      },
      (msg) => toast.error(msg),
      { bankAccountId: accountId }
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Bank Reconciliation"
        description="Import bank statement CSV, review pay in / pay out lines, and match to bills or receivables"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Bank Reconciliation" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={onImportFile}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/treasury/bank-accounts">Bank accounts</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={autoMatching || !bankAccountId}
              onClick={() => void handleAutoMatch()}
            >
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              {autoMatching ? "Matching…" : "Auto-match payments"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Reconciliation session</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading…"
                  : session
                    ? `${session.bankAccountName} · ${unmatchedStmt.length} unmatched line(s)`
                    : "No bank account configured"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-56">
                <Select
                  value={bankAccountId}
                  onValueChange={(value) => {
                    setBankAccountId(value);
                    setSelectedStmt(null);
                    setSelectedSys(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(snapshot?.bankAccounts ?? []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant={session?.status === "RECONCILED" ? "default" : "secondary"}>
                {session?.status ?? "OPEN"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Bank statement lines</CardTitle>
              <CardDescription>
                Imported CSV lines with pay in (credit/receipt) and pay out (debit/payment) columns.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading statement lines…</div>
              ) : statements.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">No statement lines yet.</p>
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    <Icons.Upload className="mr-2 h-4 w-4" />
                    Import bank statement CSV
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Pay in</TableHead>
                      <TableHead className="text-right">Pay out</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statements.map((line) => (
                      <TableRow
                        key={line.id}
                        data-state={selectedStmt === line.id ? "selected" : undefined}
                        className={selectedStmt === line.id ? "bg-primary/5" : undefined}
                      >
                        <TableCell className="whitespace-nowrap text-sm">{line.date}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm font-medium truncate">{line.description}</p>
                            {line.reference ? (
                              <p className="text-xs text-muted-foreground truncate">{line.reference}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400">
                          {line.payIn > 0 ? formatMoney(line.payIn, currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-destructive">
                          {line.payOut > 0 ? formatMoney(line.payOut, currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {line.balance != null ? formatMoney(line.balance, currency) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={line.status === "MATCHED" ? "default" : "secondary"}>
                            {line.status === "MATCHED" ? "Matched" : "Unmatched"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {line.status !== "MATCHED" ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant={selectedStmt === line.id ? "default" : "outline"}
                                onClick={() =>
                                  setSelectedStmt((prev) => (prev === line.id ? null : line.id))
                                }
                              >
                                Match
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCreatePayment(line)}>
                                Pay
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Match to bill or receivable</CardTitle>
                <CardDescription className="text-xs">
                  {selectedLine
                    ? selectedLine.amount >= 0
                      ? "Pay in — match to open customer invoices (receivables)"
                      : "Pay out — match to open supplier bills (payables)"
                    : "Select a statement line to see suggested matches"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[360px] overflow-auto">
                {!selectedLine ? (
                  <p className="text-sm text-muted-foreground">No line selected.</p>
                ) : loadingSuggestions ? (
                  <p className="text-sm text-muted-foreground">Loading suggestions…</p>
                ) : suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No open {selectedLine.amount >= 0 ? "invoices" : "bills"} match this amount.
                    Use Pay to create a payment manually.
                  </p>
                ) : (
                  suggestions.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.partyName} · {item.date}
                          </p>
                        </div>
                        <Badge variant="outline">{item.side === "AR" ? "Receivable" : "Bill"}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">
                          {formatMoney(item.outstanding, item.currency ?? currency)}
                        </span>
                        <Button
                          size="sm"
                          disabled={matchingDocId === item.id}
                          onClick={() => void handleMatchToDocument(item.id)}
                        >
                          {matchingDocId === item.id ? "Matching…" : "Match"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System payments</CardTitle>
                <CardDescription className="text-xs">
                  Match statement lines to existing posted payments ({unmatchedSys.length} unmatched).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[280px] overflow-auto">
                {systemTxns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No system payments for this account.</p>
                ) : (
                  systemTxns.map((txn) => (
                    <SystemTxnRow
                      key={txn.id}
                      txn={txn}
                      currency={currency}
                      selected={selectedSys === txn.id}
                      onSelect={() =>
                        setSelectedSys((prev) => (prev === txn.id ? null : txn.id))
                      }
                    />
                  ))
                )}
              </CardContent>
              <CardContent className="border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!selectedStmt || !selectedSys}
                  onClick={async () => {
                    if (!selectedStmt || !selectedSys) return;
                    try {
                      await matchBankReconLinesApi(selectedStmt, selectedSys);
                      await refreshSnapshot(bankAccountId);
                      setSelectedStmt(null);
                      setSelectedSys(null);
                      toast.success("Statement line matched to system payment.");
                    } catch (e) {
                      toast.error((e as Error).message || "Match failed.");
                    }
                  }}
                >
                  Match selected to payment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adjustments</CardTitle>
            <CardDescription>
              Create a journal entry for bank charges, FX differences, or other unreconciled items.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {unmatchedStmt.length} unmatched statement line(s) · {unmatchedSys.length} unmatched system payment(s)
            </span>
            <Button
              variant="default"
              size="sm"
              disabled={!selectedStmt || creatingAdjusting}
              onClick={() => void handleCreateAdjustingEntry()}
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              {creatingAdjusting ? "Creating…" : "Create adjusting entry"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Import bank statement CSV</SheetTitle>
            <SheetDescription>
              Upload a CSV with Date, Description, and either Amount or separate Debit/Credit (Pay In/Pay Out) columns.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank account</Label>
              <Select value={importAccountId || bankAccountId} onValueChange={setImportAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {(snapshot?.bankAccounts ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Supported CSV formats</p>
              <p>Date, Description, Debit, Credit, Balance, Reference</p>
              <p>Date, Description, Pay Out, Pay In, Reference</p>
              <p>Date, Description, Amount (negative = pay out, positive = pay in)</p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!isApiConfigured()) {
                  toast.info("Set NEXT_PUBLIC_API_URL to import statements.");
                  return;
                }
                importInputRef.current?.click();
              }}
            >
              <Icons.Upload className="mr-2 h-4 w-4" />
              Choose CSV file
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create payment from statement line</SheetTitle>
            <SheetDescription>
              {pendingLine
                ? `${pendingLine.payIn > 0 ? "Receipt (pay in)" : "Payment (pay out)"} for ${pendingLine.description}`
                : "Select the counterparty and allocate to open items."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {pendingLine ? (
              <div className="rounded border p-3 text-sm">
                <p className="font-medium">{pendingLine.description}</p>
                <p className="text-muted-foreground">
                  {pendingLine.date} ·{" "}
                  {pendingLine.payIn > 0
                    ? `Pay in ${formatMoney(pendingLine.payIn, currency)}`
                    : `Pay out ${formatMoney(pendingLine.payOut, currency)}`}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Counterparty</Label>
              <AsyncSearchableSelect
                value={counterpartyId}
                onValueChange={(value) => {
                  setCounterpartyId(value);
                  if (!value) setSelectedCounterpartyOption(null);
                }}
                onOptionSelect={(option) => setSelectedCounterpartyOption(option)}
                loadOptions={
                  pendingLine?.amount && pendingLine.amount >= 0
                    ? searchArCustomerOptionsApi
                    : searchApSupplierOptionsApi
                }
                selectedOption={selectedCounterpartyOption}
                placeholder="Select counterparty"
                searchPlaceholder="Type name, code, phone, or email"
                emptyMessage="No counterparties found."
                recentStorageKey={
                  pendingLine?.amount && pendingLine.amount >= 0
                    ? "lookup:recent-customers"
                    : "lookup:recent-suppliers"
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Allocate to open {pendingLine?.amount && pendingLine.amount >= 0 ? "invoices" : "bills"}</Label>
              <div className="rounded border divide-y max-h-48 overflow-auto">
                {openItems.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No open items for this counterparty.
                  </div>
                ) : (
                  openItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                      <span className="truncate">
                        {item.number} · {formatMoney(item.outstanding, item.currency ?? currency)}
                      </span>
                      <Input
                        type="number"
                        className="w-28 h-8 shrink-0"
                        placeholder="Amount"
                        value={openItemAllocations[item.id] ?? ""}
                        onChange={(e) =>
                          setOpenItemAllocations((current) => ({
                            ...current,
                            [item.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreatePaymentSubmit()} disabled={creating || !counterpartyId}>
              {creating ? "Creating…" : "Create and match payment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

function SystemTxnRow({
  txn,
  currency,
  selected,
  onSelect,
}: {
  txn: SystemTransaction;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isIn = txn.amount >= 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      } ${txn.matchedId ? "opacity-60" : ""}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{txn.reference}</p>
          <p className="text-xs text-muted-foreground truncate">{txn.description}</p>
          <p className="text-xs text-muted-foreground">{txn.date}</p>
        </div>
        <span
          className={`font-mono text-sm shrink-0 ${
            isIn ? "text-green-600 dark:text-green-400" : "text-destructive"
          }`}
        >
          {isIn ? "Pay in " : "Pay out "}
          {formatMoney(Math.abs(txn.amount), currency)}
        </span>
      </div>
      {txn.matchedId ? (
        <p className="text-xs text-muted-foreground mt-1">Matched</p>
      ) : null}
    </button>
  );
}
