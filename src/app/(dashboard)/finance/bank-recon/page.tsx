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
  createBankReconPaymentFromStatementApi,
  fetchBankReconSnapshotApi,
  matchBankReconLinesApi,
  type BankStatementLine,
  type BankReconSnapshot,
  type SystemTransaction,
} from "@/lib/api/bank-recon";
import { fetchApSuppliersApi, fetchArCustomersApi } from "@/lib/api/payments";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BankReconPage() {
  const router = useRouter();
  const [selectedStmt, setSelectedStmt] = React.useState<string | null>(null);
  const [selectedSys, setSelectedSys] = React.useState<string | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [snapshot, setSnapshot] = React.useState<BankReconSnapshot | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [pendingLine, setPendingLine] = React.useState<BankStatementLine | null>(null);
  const [counterpartySearch, setCounterpartySearch] = React.useState("");
  const [counterpartyId, setCounterpartyId] = React.useState("");
  const [counterpartyOptions, setCounterpartyOptions] = React.useState<Array<{ id: string; name: string }>>([]);

  const refreshSnapshot = React.useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await fetchBankReconSnapshotApi(snapshot?.session.bankAccountId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [snapshot?.session.bankAccountId]);

  React.useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const session = snapshot?.session;
  const statements = snapshot?.statements ?? [];
  const systemTxns = snapshot?.systemTxns ?? [];

  const unmatchedStmt = statements.filter((s) => !s.matchedId);
  const unmatchedSys = systemTxns.filter((t) => !t.matchedId);
  const hasFxDifference =
    !!session &&
    (session.statementCurrency !== session.baseCurrency ||
      statements.some((s) => s.currency && s.currency !== session.baseCurrency));

  const handleCreateAdjustingEntry = () => {
    toast.success("Draft adjustment journal prepared for review.");
    router.push("/docs/journal/new");
  };

  const handleAISuggest = () => {
    toast.success("Suggested closest amount/date matches in demo mode.");
  };

  React.useEffect(() => {
    if (!createOpen || !pendingLine) return;
    let cancelled = false;
    const load = async () => {
      const items =
        pendingLine.amount >= 0
          ? await fetchArCustomersApi(counterpartySearch)
          : await fetchApSuppliersApi(counterpartySearch);
      if (!cancelled) {
        setCounterpartyOptions(items);
      }
    };
    void load().catch((e) => {
      if (!cancelled) toast.error((e as Error).message || "Failed to load counterparties.");
    });
    return () => {
      cancelled = true;
    };
  }, [createOpen, pendingLine, counterpartySearch]);

  const handleCreatePayment = (lineId: string) => {
    const line = statements.find((item) => item.id === lineId);
    if (!line) return;
    setPendingLine(line);
    setCounterpartySearch("");
    setCounterpartyId("");
    setCounterpartyOptions([]);
    setCreateOpen(true);
  };

  const handleCreatePaymentSubmit = async () => {
    if (!pendingLine || !counterpartyId) {
      toast.error("Select a counterparty first.");
      return;
    }
    setCreating(true);
    try {
      const result = await createBankReconPaymentFromStatementApi(pendingLine, counterpartyId);
      toast.success(`Created and matched payment ${result.number}.`);
      setCreateOpen(false);
      setPendingLine(null);
      setCounterpartyId("");
      await refreshSnapshot();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create payment.");
    } finally {
      setCreating(false);
    }
  };

  const handleImportStatement = () => {
    if (isApiConfigured()) {
      importInputRef.current?.click();
      return;
    }
    toast.info("Import statement: set NEXT_PUBLIC_API_URL to use backend.");
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(
      "/api/import/bank-statement",
      file,
      (data) => {
        if (data.imported != null) toast.success(`Imported ${data.imported} line(s).`);
        else if (data.jobId) toast.success("Import queued. " + (data.message ?? ""));
        else toast.success("Import completed.");
        void refreshSnapshot();
      },
      (msg) => toast.error(msg),
      session?.bankAccountId ? { bankAccountId: session.bankAccountId } : undefined
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Bank Reconciliation"
        description="Reconcile bank statements with system transactions"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Bank Reconciliation" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.ofx,.qfx"
              className="hidden"
              onChange={onImportFile}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/treasury/overview">Treasury</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleAISuggest}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              AI match suggestions
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportStatement}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import Statement
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {/* Reconcile session header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Reconcile session</CardTitle>
              <CardDescription>
                {loading || !session
                  ? "Loading reconciliation session..."
                  : `${session.bankAccountName} · Statement: ${session.statementCurrency} · Base: ${session.baseCurrency}`}
              </CardDescription>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {session?.status ?? "OPEN"}
            </span>
          </CardHeader>
        </Card>

        {hasFxDifference && session && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">FX differences</p>
            <p className="text-muted-foreground mt-0.5">
              Statement currency ({session.statementCurrency}) differs from base ({session.baseCurrency}) for some lines. 
              Match or create adjusting entries for FX gains/losses.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[200px_1fr_1fr]">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Rules</CardTitle>
              <CardDescription className="text-xs">Matching rules and heuristics for reconciliation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                type="button"
                className="w-full text-left rounded border px-2 py-1.5 text-xs hover:bg-muted/50"
                onClick={() => toast.success("Primary amount/date rule highlighted for matching review.")}
              >
                Auto-match by amount/date
              </button>
              <button
                type="button"
                className="w-full text-left rounded border px-2 py-1.5 text-xs hover:bg-muted/50"
                onClick={() => toast.success("Reference-based matching rule highlighted for review.")}
              >
                Match by reference contains
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank statement</CardTitle>
              <CardDescription>Lines from imported statement.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {statements.map((line) => (
                  <StatementRow
                    key={line.id}
                    line={line}
                    selected={selectedStmt === line.id}
                    onSelect={() =>
                      setSelectedStmt((prev) =>
                        prev === line.id ? null : line.id
                      )
                    }
                    onCreatePayment={() => handleCreatePayment(line.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System transactions</CardTitle>
              <CardDescription>Payments and receipts in system.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {systemTxns.map((txn) => (
                  <SystemTxnRow
                    key={txn.id}
                    txn={txn}
                    selected={selectedSys === txn.id}
                    onSelect={() =>
                      setSelectedSys((prev) =>
                        prev === txn.id ? null : txn.id
                      )
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Match &amp; adjust</CardTitle>
            <CardDescription>
              Select a statement line and a system transaction to match, or create an adjusting entry for unreconciled items.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Unmatched: {unmatchedStmt.length} statement · {unmatchedSys.length} system
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedStmt || !selectedSys}
              onClick={async () => {
                if (!selectedStmt || !selectedSys) return;
                await matchBankReconLinesApi(selectedStmt, selectedSys);
                await refreshSnapshot();
                setSelectedStmt(null);
                setSelectedSys(null);
                toast.success("Statement line matched to system transaction.");
              }}
            >
              Match selected
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateAdjustingEntry}
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create adjusting entry
            </Button>
          </CardContent>
        </Card>
      </div>
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create payment from statement line</SheetTitle>
            <SheetDescription>
              {pendingLine
                ? `${pendingLine.amount >= 0 ? "Receipt" : "Payment"} for ${pendingLine.description}`
                : "Select the correct counterparty before creating the payment."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {pendingLine ? (
              <div className="rounded border p-3 text-sm">
                <p className="font-medium">{pendingLine.description}</p>
                <p className="text-muted-foreground">
                  {pendingLine.date} · {pendingLine.amount.toLocaleString()} {pendingLine.currency ?? "KES"}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Search {pendingLine?.amount && pendingLine.amount >= 0 ? "customer" : "supplier"}</Label>
              <Input
                value={counterpartySearch}
                onChange={(e) => setCounterpartySearch(e.target.value)}
                placeholder="Type name, email, or code"
              />
            </div>
            <div className="space-y-2">
              <Label>Counterparty</Label>
              <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select counterparty" />
                </SelectTrigger>
                <SelectContent>
                  {counterpartyOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreatePaymentSubmit()} disabled={creating || !counterpartyId}>
              {creating ? "Creating..." : "Create and match payment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

function StatementRow({
  line,
  selected,
  onSelect,
  onCreatePayment,
}: {
  line: BankStatementLine;
  selected: boolean;
  onSelect: () => void;
  onCreatePayment: () => void;
}) {
          const isUnmatched = !line.matchedId;
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/50"
      } ${line.matchedId ? "opacity-60" : ""}`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-sm">{line.description}</p>
            <p className="text-xs text-muted-foreground">
              {line.date}
              {line.currency && line.currency !== "KES" && (
                <span className="ml-1">· {line.currency}</span>
              )}
            </p>
          </div>
          <span
            className={`font-mono text-sm ${
              line.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
            }`}
          >
            {line.amount >= 0 ? "+" : ""}
            {line.amount.toLocaleString()}
          </span>
        </div>
        {line.matchedId && (
          <p className="text-xs text-muted-foreground mt-1">Matched</p>
        )}
      </button>
      {isUnmatched && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-xs"
          onClick={(e) => { e.stopPropagation(); onCreatePayment(); }}
        >
          Create payment manually
        </Button>
      )}
    </div>
  );
}

function SystemTxnRow({
  txn,
  selected,
  onSelect,
}: {
  txn: SystemTransaction;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/50"
      } ${txn.matchedId ? "opacity-60" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-sm">{txn.reference} – {txn.description}</p>
          <p className="text-xs text-muted-foreground">{txn.date}</p>
        </div>
        <span
          className={`font-mono text-sm ${
            txn.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
          }`}
        >
          {txn.amount >= 0 ? "+" : ""}
          {txn.amount.toLocaleString()}
        </span>
      </div>
      {txn.matchedId && (
        <p className="text-xs text-muted-foreground mt-1">Matched</p>
      )}
    </button>
  );
}
