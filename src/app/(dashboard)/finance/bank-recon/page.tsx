"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  completeBankReconApi,
  createBankReconAdjustingEntryApi,
  advanceBankAllocationProposalApi,
  fetchBankAllocationProposalsApi,
  fetchControlAccountReconciliationApi,
  fetchBankReconOpenItemsApi,
  fetchBankReconSessionsApi,
  clearBankReconOutstandingApi,
  fetchBankReconSnapshotApi,
  fetchBankReconSuggestionsApi,
  markBankReconOutstandingApi,
  matchBankReconLinesApi,
  matchBankReconToDocumentApi,
  suggestBankAllocationApi,
  type BankAllocationProposal,
  type BankReconOpenItemSuggestion,
  type BankStatementLine,
  type BankReconSnapshot,
} from "@/lib/api/bank-recon";
import type { BankReconciliationSessionRecord, SystemTransaction } from "@/lib/types/bank-recon";
import { formatReconDate } from "@/lib/finance/bank-account-label";
import { searchApSupplierOptionsApi, searchArCustomerOptionsApi } from "@/lib/api/payments";
import type { PartyLookupOption } from "@/lib/api/parties";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { BankSettlementReview, BankSettlementEvidence, type ReviewedBankSettlement } from "@/components/finance/BankSettlementReview";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { bankAllocationAction, allocationBalance } from "@/lib/finance/bank-allocation-workflow";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";

function statementEquation(lines: BankStatementLine[]) {
  if (!lines.length) return null;
  const ordered = [...lines].sort((left, right) => left.date.localeCompare(right.date));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (first.balance == null || last.balance == null) return null;
  const receipts = Math.round(ordered.reduce((sum, line) => sum + line.payIn, 0) * 100) / 100;
  const payments = Math.round(ordered.reduce((sum, line) => sum + line.payOut, 0) * 100) / 100;
  const opening = Math.round((first.balance - first.amount) * 100) / 100;
  const closing = Math.round(last.balance * 100) / 100;
  const expected = Math.round((opening + receipts - payments) * 100) / 100;
  return { opening, receipts, payments, closing, ties: Math.abs(expected - closing) <= 0.009 };
}

function formatMoney(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatControlAmount(amount: number, currency = "KES") {
  const formatted = formatMoney(Math.abs(amount), currency);
  return amount < 0 ? `${formatted} credit` : formatted;
}

type BookItemDetail = {
  id: string;
  number: string;
  date: string;
  party: string;
  amount: number;
  currency?: string;
  type?: "AR_RECEIPT" | "AP_PAYMENT";
  allocations: NonNullable<SystemTransaction["allocations"]>;
  outstandingReason?: string | null;
};

export default function BankReconPage() {
  const baseCurrency = useBaseCurrency();
  const permissions = useAuthStore((state) => state.permissions);
  const userId = useAuthStore((state) => state.user?.userId);
  const canWrite = permissions.includes("finance.write");
  const canReadControls = permissions.includes("finance.read");
  const mutationLock = React.useRef(false);
  const snapshotRequest = React.useRef(0);
  const scopeKey = useAuthStore((state) => `${state.org?.orgId}:${state.user?.userId}:${state.currentBranch?.branchId}:${state.permissions.join(",")}`);
  const activeScope = React.useRef(scopeKey);
  activeScope.current = scopeKey;
  const invalidateSnapshot = React.useCallback(() => { snapshotRequest.current++; }, []);
  const [mutating, setMutating] = React.useState(false);
  const [workspaceError, setWorkspaceError] = React.useState("");
  const [confirmMatch, setConfirmMatch] = React.useState<{ lineId: string; amount: number; currency: string; document: BankReconOpenItemSuggestion } | null>(null);
  const beginMutation = () => { if (mutationLock.current) return false; mutationLock.current = true; setMutating(true); return true; };
  const endMutation = () => { mutationLock.current = false; setMutating(false); };
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
  const [settlementEnabled, setSettlementEnabled] = React.useState(false);
  const [settlementReady, setSettlementReady] = React.useState<ReviewedBankSettlement | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pendingLine, setPendingLine] = React.useState<BankStatementLine | null>(null);
  const [counterpartyId, setCounterpartyId] = React.useState("");
  const [selectedCounterpartyOption, setSelectedCounterpartyOption] = React.useState<PartyLookupOption | null>(null);
  const [openItems, setOpenItems] = React.useState<Array<{ id: string; number: string; outstanding: number; currency?: string }>>([]);
  const [openItemAllocations, setOpenItemAllocations] = React.useState<Record<string, number>>({});
  const [creatingAdjusting, setCreatingAdjusting] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [bookQuery, setBookQuery] = React.useState("");
  const [completing, setCompleting] = React.useState(false);
  const [sessions, setSessions] = React.useState<BankReconciliationSessionRecord[]>([]);
  const [viewPaymentDetail, setViewPaymentDetail] = React.useState<BookItemDetail | null>(null);
  const [outstandingFor, setOutstandingFor] = React.useState<string | null>(null);
  const [outstandingReason, setOutstandingReason] = React.useState("");
  const [allocationProposals, setAllocationProposals] = React.useState<BankAllocationProposal[]>([]);
  const [controlAccounts, setControlAccounts] = React.useState<Array<{
    side: "AR" | "AP"; controlAccountCode: string; controlAccountName?: string;
    glBalance?: number; subledgerBalance?: number; difference?: number; reconciled?: boolean; error?: string;
    mappingsHref?: string;
  }>>([]);

  const clearAccountLists = React.useCallback((accountId?: string) => {
    setSelectedStmt(null);
    setSelectedSys(null);
    setOutstandingFor(null);
    setBookQuery("");
    setSessions([]);
    setLoading(true);
    setSnapshot((current) => {
      if (!current) return current;
      const account = accountId ? current.bankAccounts.find((item) => item.id === accountId) : undefined;
      return {
        ...current,
        statements: [],
        systemTxns: [],
        position: null,
        session: accountId
          ? { ...current.session, bankAccountId: accountId, bankAccountName: account?.name ?? current.session.bankAccountName, status: "OPEN" }
          : current.session,
      };
    });
  }, []);

  const refreshSnapshot = React.useCallback(async (accountId?: string) => {
    const generation = ++snapshotRequest.current;
    const requestScope = scopeKey;
    setLoading(true);
    setWorkspaceError("");
    try {
      const data = await fetchBankReconSnapshotApi(accountId || undefined, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (generation !== snapshotRequest.current || requestScope !== activeScope.current) return;
      setSnapshot(data);
      if (!accountId && data.bankAccounts[0]?.id) {
        setBankAccountId(data.bankAccounts[0].id);
      }
      const sessionList = await fetchBankReconSessionsApi(accountId || data.bankAccounts[0]?.id);
      if (generation !== snapshotRequest.current || requestScope !== activeScope.current) return;
      setSessions(sessionList);
      const [proposals, controls] = await Promise.all([
        fetchBankAllocationProposalsApi(),
        canReadControls ? fetchControlAccountReconciliationApi() : Promise.resolve([]),
      ]);
      if (generation !== snapshotRequest.current || requestScope !== activeScope.current) return;
      setAllocationProposals(proposals.filter((proposal) => data.statements.some((line) => line.id === proposal.statementLineId)));
      setControlAccounts(controls);
    } catch (e) {
      if (generation !== snapshotRequest.current || requestScope !== activeScope.current) return;
      setWorkspaceError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      if (generation === snapshotRequest.current && requestScope === activeScope.current) setLoading(false);
    }
  }, [dateFrom, dateTo, canReadControls, scopeKey]);

  React.useEffect(() => {
    snapshotRequest.current++;
    setSnapshot(null); setBankAccountId(""); setSelectedStmt(null); setSelectedSys(null); setConfirmMatch(null); setAllocationProposals([]); setControlAccounts([]); setCreateOpen(false); setViewPaymentDetail(null); setSessions([]); setSuggestions([]); setPendingLine(null);
    return invalidateSnapshot;
  }, [scopeKey, invalidateSnapshot]);

  React.useEffect(() => {
    void refreshSnapshot(bankAccountId || undefined);
  }, [bankAccountId, refreshSnapshot, dateFrom, dateTo]);

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
  const equation = statementEquation(statements);
  const systemTxns = snapshot?.systemTxns ?? [];
  const currency = session?.statementCurrency ?? baseCurrency;

  const unmatchedStmt = statements.filter((s) => s.status !== "MATCHED");
  const unmatchedSys = systemTxns.filter((t) => !t.matchedId);
  const unmarkedBook = unmatchedSys.filter((txn) => !txn.outstandingReason);
  const outstandingReceipts = unmatchedSys.filter((txn) => txn.amount > 0).reduce((sum, txn) => sum + txn.amount, 0);
  const outstandingPayments = unmatchedSys.filter((txn) => txn.amount < 0).reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  const statementClosing = equation?.closing ?? null;
  const bookBalance = snapshot?.position?.bookBalance ?? null;
  const unexplainedDifference = bookBalance != null && statementClosing != null
    ? Math.round((bookBalance - (statementClosing + outstandingReceipts - outstandingPayments)) * 100) / 100
    : null;

  const selectedLine = statements.find((line) => line.id === selectedStmt) ?? null;
  const selectedBook = systemTxns.find((txn) => txn.id === selectedSys) ?? null;
  const bookQueryNormalized = bookQuery.trim().toLowerCase();
  const visibleBooks = bookQueryNormalized
    ? systemTxns.filter((txn) => `${txn.reference} ${txn.description}`.toLowerCase().includes(bookQueryNormalized))
    : systemTxns;
  const canComplete = Boolean(
    canWrite && !mutating && !completing && bankAccountId && statements.length > 0 && unmatchedStmt.length === 0 && unmarkedBook.length === 0,
  );
  const nextStep = statements.length === 0
    ? {
        title: "Import the statement",
        detail: unmarkedBook.length > 0
          ? `${unmarkedBook.length} book item${unmarkedBook.length === 1 ? "" : "s"} already ${unmarkedBook.length === 1 ? "sits" : "sit"} on this account. Match ${unmarkedBook.length === 1 ? "it" : "them"} once the statement is in, or leave ${unmarkedBook.length === 1 ? "it" : "each one"} outstanding with a reason.`
          : "This account has no statement lines, and nothing unmatched on the books.",
      }
    : unmatchedStmt.length > 0
      ? {
          title: "Match the statement",
          detail: `${unmatchedStmt.length} statement line${unmatchedStmt.length === 1 ? "" : "s"} still ${unmatchedStmt.length === 1 ? "needs" : "need"} a book receipt or payment.`,
        }
      : unmarkedBook.length > 0
        ? {
            title: "Clear the books",
            detail: `${unmarkedBook.length} book item${unmarkedBook.length === 1 ? " is" : "s are"} still unmatched. Match each one, or leave it outstanding with a reason.`,
          }
        : {
            title: "Sign off",
            detail: "Every statement line is matched, and every book item is matched or left outstanding.",
          };

  const handleAutoMatch = async () => {
    if (!bankAccountId) {
      toast.error("Select a bank account first.");
      return;
    }
    if (statements.length === 0) {
      toast.message("No statement lines were found.");
      return;
    }
    if (!canWrite || !beginMutation()) return;
    setAutoMatching(true);
    try {
      const result = await autoMatchBankReconApi(bankAccountId);
      if (result.statementLines === 0) {
        toast.message("No statement lines were found.");
        return;
      }
      toast.success(`Auto-matched ${result.matched} line(s). ${result.unmatched} still unmatched.`);
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Auto-match failed.");
    } finally {
      setAutoMatching(false);
      endMutation();
    }
  };

  const handleMatchToDocument = async (documentId: string, lineId: string) => {
    if (!canWrite || !beginMutation()) return;
    setMatchingDocId(documentId);
    try {
      const result = await matchBankReconToDocumentApi(lineId, documentId);
      toast.success(result.replayed ? `Already completed · ${result.number}. No new payment created.` : `Payment ${result.number} created and matched.`);
      setSelectedStmt(null);
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Match failed.");
    } finally {
      setMatchingDocId(null);
      endMutation();
    }
  };

  const handleCreateAdjustingEntry = async () => {
    if (!selectedStmt) {
      toast.error("Select an unmatched statement line first.");
      return;
    }
    if (!canWrite || !beginMutation()) return;
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
      endMutation();
    }
  };

  const handleCompleteReconciliation = async () => {
    if (!bankAccountId) {
      toast.error("Select a bank account first.");
      return;
    }
    if (!canWrite || !beginMutation()) return;
    setCompleting(true);
    try {
      const result = await completeBankReconApi({
        bankAccountId,
        periodStart: dateFrom || undefined,
        periodEnd: dateTo || undefined,
      });
      toast.success(`Reconciliation completed (${result.matchedCount} line(s) matched).`);
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Complete reconciliation failed.");
    } finally {
      setCompleting(false);
      endMutation();
    }
  };

  const openBookItem = (paymentId: string) => {
    const txn = systemTxns.find((item) => item.id === paymentId) ?? snapshot?.systemTxns.find((item) => item.id === paymentId);
    if (!txn) {
      toast.info("Payment details not found.");
      return;
    }
    setViewPaymentDetail({
      id: txn.id,
      number: txn.reference,
      date: txn.date,
      party: txn.description,
      amount: Math.abs(txn.amount),
      currency: txn.currency ?? currency,
      type: txn.type ?? (txn.amount < 0 ? "AP_PAYMENT" : "AR_RECEIPT"),
      allocations: txn.allocations ?? [],
      outstandingReason: txn.outstandingReason,
    });
  };

  const saveOutstanding = async (paymentId: string) => {
    const reason = outstandingReason.trim();
    if (reason.length < 3) {
      toast.error("Give a short reason for leaving this item outstanding.");
      return;
    }
    if (!bankAccountId || !canWrite || !beginMutation()) return;
    try {
      await markBankReconOutstandingApi({ bankAccountId, paymentId, reason });
      toast.success("Left outstanding. It will not block sign-off.");
      setOutstandingFor(null);
      setOutstandingReason("");
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Could not leave this item outstanding.");
    } finally {
      endMutation();
    }
  };

  const clearOutstanding = async (paymentId: string) => {
    if (!canWrite || !beginMutation()) return;
    try {
      await clearBankReconOutstandingApi(paymentId);
      toast.success("Outstanding mark removed.");
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Could not clear the outstanding mark.");
    } finally {
      endMutation();
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
    setSettlementEnabled(false); setSettlementReady(null);
    setPendingLine(line);
    setCounterpartyId("");
    setSelectedCounterpartyOption(null);
    setOpenItems([]);
    setOpenItemAllocations({});
    setCreateOpen(true);
  };

  const groupedAllocations = Object.entries(openItemAllocations).filter(([, amount]) => amount > 0).map(([documentId, amount]) => ({ documentId, amount }));
  const settlementSourceKey = JSON.stringify({ lineId: pendingLine?.id ?? "", partyId: counterpartyId, allocations: groupedAllocations });
  const allocationReady = pendingLine && (settlementEnabled ? settlementReady?.sourceKey === settlementSourceKey : allocationBalance(pendingLine.amount, openItemAllocations).valid);
  const handleCreatePaymentSubmit = async () => {
    if (!pendingLine || !counterpartyId) {
      toast.error("Select a counterparty first.");
      return;
    }
    if (!canWrite || !allocationReady || !beginMutation()) return;
    setCreating(true);
    try {
      const allocations = Object.entries(openItemAllocations)
        .filter(([, amount]) => amount > 0)
        .map(([documentId, amount]) => ({ documentId, amount }));
      await suggestBankAllocationApi({
        statementLineId: pendingLine.id,
        partyId: counterpartyId,
        allocations,
        source: "MANUAL",
        ...(settlementEnabled && settlementReady ? { settlementTerms: settlementReady.terms, previewDigest: settlementReady.preview.digest } : {}),
      });
      toast.success("Grouped allocation suggested. A different user must approve, post, and close it.");
      setCreateOpen(false);
      setPendingLine(null);
      setCounterpartyId("");
      await refreshSnapshot(bankAccountId);
    } catch (e) {
      toast.error((e as Error).message || "Failed to create payment.");
    } finally {
      setCreating(false);
      endMutation();
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
        if (data.imported != null) toast.success(`Imported ${data.imported} line(s). Run auto-match to link payments.`);
        else toast.success("Import completed. Run auto-match to link payments.");
        setImportOpen(false);
        setBankAccountId(accountId);
        void refreshSnapshot(accountId).then(async () => {
          try {
            const result = await autoMatchBankReconApi(accountId);
            if (result.matched > 0) {
              toast.success(`Auto-matched ${result.matched} line(s). ${result.unmatched} still unmatched.`);
              await refreshSnapshot(accountId);
            }
          } catch {
            /* auto-match optional after import */
          }
        });
      },
      (msg) => toast.error(msg),
      { bankAccountId: accountId }
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Bank Reconciliation"
        description="Match the bank statement to the books, then sign off."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Bank Reconciliation" },
        ]}
        sticky
        showCommandHint
        actionsBelow
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={onImportFile}
            />
            <Button size="sm" disabled={!canWrite || mutating} onClick={() => setImportOpen(true)}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canWrite || mutating || autoMatching || !bankAccountId || statements.length === 0}
              title={statements.length === 0 ? "Import a statement first." : undefined}
              onClick={() => void handleAutoMatch()}
            >
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              {autoMatching ? "Matching…" : "Auto-match"}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/treasury/bank-accounts">Bank accounts</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild><Link href="/finance/legacy-fx">Legacy FX</Link></Button>
          </div>
        }
      />

      <div className="space-y-4 p-6">
        {workspaceError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-medium">Reconciliation could not refresh</p><p>{workspaceError}</p><Button variant="outline" size="sm" className="mt-2" onClick={() => void refreshSnapshot(bankAccountId)}>Retry refresh</Button></div>}
        <ConfirmDialog open={!!confirmMatch} onOpenChange={(open) => { if (!open) setConfirmMatch(null); }} title="Create and post a payment?" description={confirmMatch ? `This creates a new ${confirmMatch.document.side === "AR" ? "receipt" : "payment"} for ${confirmMatch.document.partyName}, settles ${confirmMatch.document.number}, and matches the bank line. Check existing system payments first. The amount is ${formatMoney(confirmMatch.amount, confirmMatch.currency)}.` : ""} confirmLabel="Create payment & match" onConfirm={() => { if (confirmMatch) void handleMatchToDocument(confirmMatch.document.id, confirmMatch.lineId); }}/>
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(16rem,1.4fr)_10rem_10rem]">
              <div className="space-y-1">
                <Label htmlFor="recon-account">Account</Label>
                <Select
                  value={bankAccountId}
                  onValueChange={(value) => {
                    setBankAccountId(value);
                    clearAccountLists(value);
                  }}
                >
                  <SelectTrigger id="recon-account" className="w-full">
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
              <div className="space-y-1">
                <Label htmlFor="recon-from">From</Label>
                <Input
                  id="recon-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    clearAccountLists();
                  }}
                  aria-label="Statement from date"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recon-to">To</Label>
                <Input
                  id="recon-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    clearAccountLists();
                  }}
                  aria-label="Statement to date"
                />
              </div>
            </div>
            <Badge variant={session?.status === "RECONCILED" ? "default" : "secondary"} className="w-fit tracking-wide">
              {session?.status ?? "OPEN"}
            </Badge>
          </div>
          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {loading ? `Loading ${session?.bankAccountName ?? "this account"}…` : nextStep.title}
              </p>
              <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
                {loading ? "Fetching the statement and the books for this account." : nextStep.detail}
              </p>
              {mutating ? <p role="status" className="mt-1 text-xs text-muted-foreground">Saving this action…</p> : null}
            </div>
            <Button
              className="shrink-0"
              data-tutorial-hint="bank-close"
              variant={canComplete ? "default" : "outline"}
              disabled={!canComplete}
              title={canComplete ? "Sign off this account." : nextStep.detail}
              onClick={() => void handleCompleteReconciliation()}
            >
              {completing ? "Completing…" : "Complete reconciliation"}
            </Button>
          </div>
          <div className={`grid divide-x divide-y border-t transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-5 ${loading ? "opacity-50" : "opacity-100"}`}>
            <BalanceFigure label="Book balance" value={loading ? null : bookBalance} currency={currency} note={loading ? undefined : snapshot?.position?.note} empty={loading ? "Loading…" : "—"} />
            <BalanceFigure label="Statement closing" value={loading ? null : statementClosing} currency={currency} empty={loading ? "Loading…" : "No statement"} />
            <BalanceFigure label="Outstanding receipts" value={loading ? null : outstandingReceipts} currency={currency} empty="Loading…" />
            <BalanceFigure label="Outstanding payments" value={loading ? null : outstandingPayments} currency={currency} empty="Loading…" />
            <BalanceFigure
              label="Unexplained difference"
              value={loading ? null : unexplainedDifference}
              currency={currency}
              empty={loading ? "Loading…" : statementClosing == null ? "Needs a statement" : snapshot?.position?.note ? "Book balance unavailable" : "—"}
              emphasize
            />
          </div>
          {(snapshot?.cashAccounts.length ?? 0) > 0 ? (
            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Petty cash and the upcountry travel float stay on <Link href="/treasury/bank-accounts" className="underline decoration-1 underline-offset-2">Bank accounts</Link>. They are kept on the cash register.
            </p>
          ) : null}
        </section>

        <div
          className="grid items-start gap-4 xl:grid-cols-2"
          data-tutorial-hint="bank-match-workspace"
        >
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement</CardTitle>
              <CardDescription>
                {loading ? "Loading this account…" : statements.length === 0 ? "Nothing imported for this account yet." : `${statements.length} line${statements.length === 1 ? "" : "s"} · ${unmatchedStmt.length} still to match`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 px-4 py-6">
                  <div className="h-8 animate-pulse rounded-md bg-muted" />
                  <div className="h-8 animate-pulse rounded-md bg-muted" />
                  <div className="h-8 animate-pulse rounded-md bg-muted" />
                </div>
              ) : statements.length === 0 ? (
                <div className="space-y-3 px-6 py-10">
                  <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">Import the CSV from the bank. Pay in and pay out land here, ready to match against the books.</p>
                  <Button size="sm" disabled={!canWrite || mutating} onClick={() => setImportOpen(true)}>
                    <Icons.Upload className="mr-2 h-4 w-4" />
                    Import CSV
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
                        <TableCell className="whitespace-nowrap text-sm">{formatReconDate(line.date)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm font-medium truncate">{line.description}</p>
                            {line.reference ? (
                              <p className="text-xs text-muted-foreground truncate">{line.reference}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-green-600 dark:text-green-400" data-sort-value={(line.payIn > 0) ? (line.payIn) : null}>
                          {line.payIn > 0 ? formatMoney(line.payIn, currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-destructive" data-sort-value={(line.payOut > 0) ? (line.payOut) : null}>
                          {line.payOut > 0 ? formatMoney(line.payOut, currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground" data-sort-value={(line.balance != null) ? (line.balance) : null}>
                          {line.balance != null ? formatMoney(line.balance, currency) : "—"}
                        </TableCell>
                        <TableCell>
                          {line.status === "MATCHED" ? (
                            <div className="space-y-1">
                              <Badge variant="default">Matched</Badge>
                              {line.matchedDocumentId ? (
                                <Link
                                  href={
                                    line.amount >= 0
                                      ? `/docs/invoice/${line.matchedDocumentId}`
                                      : `/docs/bill/${line.matchedDocumentId}`
                                  }
                                  className="block text-xs text-primary hover:underline"
                                >
                                  View {line.amount >= 0 ? "invoice" : "bill"}
                                </Link>
                              ) : null}
                              {line.matchedId ? (
                                <button
                                  type="button"
                                  className="block text-xs text-primary hover:underline text-left"
                                  onClick={() => openBookItem(line.matchedId!)}
                                >
                                  View payment
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <Badge variant="secondary">Unmatched</Badge>
                          )}
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
                              <Button size="sm" variant="ghost" disabled={!canWrite || mutating} onClick={() => handleCreatePayment(line)}>
                                Group allocation
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
          {selectedLine ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Open {selectedLine.amount >= 0 ? "invoices" : "bills"}</CardTitle>
                <CardDescription className="text-xs">
                  {selectedLine.amount >= 0 ? "This line is money in. A new receipt would settle one of these invoices." : "This line is money out. A new payment would settle one of these bills."}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[360px] space-y-2 overflow-auto">
                {loadingSuggestions ? (
                  <p className="text-sm text-muted-foreground">Looking for open documents…</p>
                ) : suggestions.length === 0 ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    No open {selectedLine.amount >= 0 ? "invoice" : "bill"} matches this amount. Use a receipt or payment already on the books, or group several documents.
                  </p>
                ) : (
                  suggestions.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.partyName} · {formatReconDate(item.date)}
                          </p>
                        </div>
                        <Badge variant="outline">{item.side === "AR" ? "Receivable" : "Bill"}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm tabular-nums">
                          {formatMoney(item.outstanding, item.currency ?? currency)}
                        </span>
                        <Button
                          size="sm"
                          disabled={!canWrite || mutating || matchingDocId !== null || item.outstanding + 0.005 < Math.abs(selectedLine.amount) || (item.currency != null && item.currency !== currency)}
                          onClick={() => setConfirmMatch({ lineId: selectedLine.id, amount: Math.abs(selectedLine.amount), currency, document: item })}
                        >
                          {matchingDocId === item.id ? "Posting…" : "Create and match"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">On the books</CardTitle>
                    <CardDescription>
                      {loading ? "Loading the books…" : `${unmarkedBook.length} still to match · ${unmatchedSys.length - unmarkedBook.length} left outstanding`}
                    </CardDescription>
                  </div>
                </div>
                {systemTxns.length > 3 ? (
                  <Input
                    value={bookQuery}
                    onChange={(event) => setBookQuery(event.target.value)}
                    placeholder="Find a receipt or payment"
                    aria-label="Find a book receipt or payment"
                  />
                ) : null}
              </CardHeader>
              {statements.length > 0 ? (
                <CardContent className="space-y-2 border-t pt-4">
                  <Button
                    size="sm"
                    className="w-full"
                    variant={selectedStmt && selectedSys ? "default" : "outline"}
                    disabled={!canWrite || mutating || !selectedStmt || !selectedSys}
                    onClick={async () => {
                      if (!selectedStmt || !selectedSys || !beginMutation()) return;
                      try {
                        await matchBankReconLinesApi(selectedStmt, selectedSys);
                        await refreshSnapshot(bankAccountId);
                        setSelectedStmt(null);
                        setSelectedSys(null);
                        toast.success("Statement line matched to the books.");
                      } catch (e) {
                        toast.error((e as Error).message || "Match failed. Refresh before retrying.");
                      } finally { endMutation(); }
                    }}
                  >
                    {selectedLine && selectedBook ? `Match ${selectedBook.reference}` : "Match to the books"}
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    {selectedLine && selectedBook
                      ? `${formatMoney(Math.abs(selectedLine.amount), currency)} on the statement with ${formatMoney(Math.abs(selectedBook.amount), currency)} on the books.`
                      : selectedLine
                        ? "Select the book receipt or payment that belongs to this line."
                        : "Select a statement line, then the book item it belongs to."}
                  </p>
                </CardContent>
              ) : null}
              <CardContent className="max-h-[32rem] space-y-2 overflow-auto">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  </div>
                ) : systemTxns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing posted to this account in the books.</p>
                ) : visibleBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing matches that search.</p>
                ) : (
                  visibleBooks.map((txn) => (
                    <SystemTxnRow
                      key={txn.id}
                      txn={txn}
                      currency={currency}
                      selected={selectedSys === txn.id}
                      selectable={statements.length > 0 && !txn.matchedId}
                      onSelect={() =>
                        setSelectedSys((prev) => (prev === txn.id ? null : txn.id))
                      }
                      onView={() => openBookItem(txn.id)}
                      leavingOutstanding={outstandingFor === txn.id}
                      reason={outstandingReason}
                      onReasonChange={setOutstandingReason}
                      onStartOutstanding={() => {
                        setOutstandingFor(txn.id);
                        setOutstandingReason(txn.outstandingReason ?? "");
                      }}
                      onCancelOutstanding={() => {
                        setOutstandingFor(null);
                        setOutstandingReason("");
                      }}
                      onSaveOutstanding={() => void saveOutstanding(txn.id)}
                      onClearOutstanding={() => void clearOutstanding(txn.id)}
                      canWrite={canWrite && !mutating}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {sessions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent reconciliations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-48 overflow-auto">
                  {sessions.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 text-xs">
                      <p className="font-medium">
                        {new Date(item.periodStart).toISOString().slice(0, 10)} – {new Date(item.periodEnd).toISOString().slice(0, 10)}
                      </p>
                      <p className="text-muted-foreground">
                        {item.matchedCount} matched · completed {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <details className="rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>Control accounts and allocations</span>
            <span className="text-xs font-normal text-muted-foreground">
              {controlAccounts.some((row) => row.error) ? "A control account needs a mapping" : allocationProposals.length > 0 ? `${allocationProposals.length} proposal${allocationProposals.length === 1 ? "" : "s"}` : "AR and AP"}
            </span>
          </summary>
          <div className="grid gap-4 border-t p-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allocation authorization</CardTitle>
              <CardDescription>Suggest → approve → post → close. Each step requires a different authorized user; GAIA can only suggest. Review source documents and amounts before taking the next action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {allocationProposals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grouped allocation proposals.</p>
              ) : allocationProposals.map((proposal) => {
                const workflow = bankAllocationAction(proposal, userId, permissions);
                const next = workflow.action;
                return (
                  <div key={proposal._id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div>
                      <p className="font-medium">{proposal.allocations.length} allocation(s) · {proposal.status}</p>
                      <p className="text-xs text-muted-foreground">{proposal.source === "GAIA" ? "GAIA proposal — never auto-posted" : "Manual proposal"}</p>
                      {workflow.reason && next && <p className="mt-1 text-xs text-muted-foreground">{workflow.reason}</p>}
                    </div>
                    <details className="text-xs"><summary className="cursor-pointer font-medium">Review allocations</summary><ul className="mt-2 space-y-2">{proposal.allocations.map((allocation) => <li key={allocation.documentId}><Link className="text-primary underline" href={`/docs/${statements.find((line) => line.id === proposal.statementLineId)!.amount >= 0 ? "invoice" : "bill"}/${encodeURIComponent(allocation.documentId)}`}>Open document</Link> · {formatMoney(allocation.amount, proposal.settlementPreview?.invoiceCurrency ?? currency)}</li>)}</ul></details>
                    {proposal.settlementPreview && <details className="text-xs"><summary className="cursor-pointer font-medium">Review fees, FX and journal</summary><BankSettlementEvidence preview={proposal.settlementPreview}/></details>}
                    {next ? (
                      <Button size="sm" variant="outline" disabled={mutating || !workflow.allowed} title={workflow.reason || undefined} onClick={async () => {
                        if (!beginMutation()) return;
                        try {
                          await advanceBankAllocationProposalApi(proposal._id, next);
                          toast.success(`Allocation ${next} complete.`);
                          await refreshSnapshot(bankAccountId);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Action failed. Refresh before retrying.");
                        } finally { endMutation(); }
                      }}>{next[0].toUpperCase() + next.slice(1)}</Button>
                    ) : <Badge>Closed</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Control-account reconciliation</CardTitle>
              <CardDescription>AR/AP subledger outstanding compared with GL control accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {controlAccounts.map((row) => (
                <div key={row.side} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{row.side} · {row.controlAccountCode}</span>
                    <Badge variant={row.reconciled ? "default" : "destructive"}>{row.error ? "Missing" : row.reconciled ? "Reconciled" : "Difference"}</Badge>
                  </div>
                  {!row.error ? (
                    <dl className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-y-1 text-xs">
                      <dt className="text-muted-foreground">GL</dt>
                      <dd className="whitespace-nowrap text-right">{formatControlAmount(row.glBalance ?? 0, currency)}</dd>
                      <dt className="text-muted-foreground">Subledger</dt>
                      <dd className="whitespace-nowrap text-right">{formatControlAmount(row.subledgerBalance ?? 0, currency)}</dd>
                      <dt className="text-muted-foreground">Difference</dt>
                      <dd className="whitespace-nowrap text-right">{formatControlAmount(row.difference ?? 0, currency)}</dd>
                    </dl>
                  ) : (
                    <p className="mt-1 text-xs text-destructive">
                      {row.error}{" "}
                      <Link href={row.mappingsHref ?? "/settings/financial/posting-mappings"} className="font-medium underline">
                        Open posting mappings
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          </div>
        </details>

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
              variant="outline"
              size="sm"
              disabled={!canWrite || mutating || !selectedStmt || creatingAdjusting}
              onClick={() => void handleCreateAdjustingEntry()}
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              {creatingAdjusting ? "Creating…" : "Create adjusting entry"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="right" className="w-full">
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
        <SheetContent side="right" className="w-full">
          <SheetHeader>
            <SheetTitle>Suggest a grouped allocation</SheetTitle>
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
                        aria-label={`Allocate to ${item.number}`}
                        min={0}
                        max={item.outstanding}
                        step="0.01"
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
          {pendingLine && <div className="mt-5"><BankSettlementReview enabled={settlementEnabled} onEnabled={setSettlementEnabled} lineId={pendingLine.id} partyId={counterpartyId} allocations={groupedAllocations} bankCurrency={currency} baseCurrency={baseCurrency} disabled={creating || mutating} onReady={setSettlementReady}/></div>}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            {pendingLine && !settlementEnabled && <div className="mr-auto text-sm" role="status">Allocated {formatMoney(allocationBalance(pendingLine.amount, openItemAllocations).allocated, currency)} · Remaining {formatMoney(allocationBalance(pendingLine.amount, openItemAllocations).remaining, currency)}</div>}
            <Button onClick={() => void handleCreatePaymentSubmit()} disabled={!canWrite || mutating || creating || !counterpartyId || !pendingLine || !allocationReady}>
              {creating ? "Saving…" : "Suggest grouped allocation"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewPaymentDetail} onOpenChange={(open) => !open && setViewPaymentDetail(null)}>
        <SheetContent side="right" className="w-full">
          <SheetHeader>
            <SheetTitle>{viewPaymentDetail?.type === "AP_PAYMENT" ? "Payment" : "Receipt"} {viewPaymentDetail?.number}</SheetTitle>
            <SheetDescription>
              {viewPaymentDetail?.type === "AP_PAYMENT" ? "Supplier payment and the bills it settles." : "Customer receipt and the invoices it settles."}
            </SheetDescription>
          </SheetHeader>
          {viewPaymentDetail ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{viewPaymentDetail.type === "AP_PAYMENT" ? "Supplier" : "Customer"}</p>
                  <p className="font-medium">{viewPaymentDetail.party}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="whitespace-nowrap font-medium">{formatMoney(viewPaymentDetail.amount, viewPaymentDetail.currency ?? currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatReconDate(viewPaymentDetail.date)}</p>
                </div>
              </div>
              {viewPaymentDetail.outstandingReason ? (
                <p className="text-sm text-muted-foreground">Outstanding: {viewPaymentDetail.outstandingReason}</p>
              ) : null}
              <div className="space-y-2">
                <Label>{viewPaymentDetail.type === "AP_PAYMENT" ? "Linked bills" : "Linked invoices"}</Label>
                <div className="rounded border divide-y">
                  {viewPaymentDetail.allocations.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No linked documents.</div>
                  ) : (
                    viewPaymentDetail.allocations.map((allocation) => {
                      const documentKind = allocation.documentType === "bill" || viewPaymentDetail.type === "AP_PAYMENT" ? "bill" : "invoice";
                      return (
                        <div key={`${allocation.documentId}-${allocation.amount}`} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <div>
                            <p className="font-medium">{allocation.documentNumber ?? allocation.documentId}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(allocation.amount, viewPaymentDetail.currency ?? currency)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/docs/${documentKind}/${allocation.documentId}`}>
                              <Icons.FileText className="mr-2 h-4 w-4" />
                              View {documentKind}
                            </Link>
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

function BalanceFigure({
  label,
  value,
  currency,
  note,
  empty = "—",
  emphasize = false,
}: {
  label: string;
  value: number | null;
  currency: string;
  note?: string;
  empty?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${emphasize ? "bg-muted/40" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 whitespace-nowrap font-mono text-sm tabular-nums ${emphasize ? "font-semibold" : "font-medium"}`}>
        {value == null ? empty : formatMoney(value, currency)}
      </p>
      {note && value == null ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function SystemTxnRow({
  txn,
  currency,
  selected,
  selectable,
  onSelect,
  onView,
  leavingOutstanding,
  reason,
  onReasonChange,
  onStartOutstanding,
  onCancelOutstanding,
  onSaveOutstanding,
  onClearOutstanding,
  canWrite,
}: {
  txn: SystemTransaction;
  currency: string;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
  onView: () => void;
  leavingOutstanding: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onStartOutstanding: () => void;
  onCancelOutstanding: () => void;
  onSaveOutstanding: () => void;
  onClearOutstanding: () => void;
  canWrite: boolean;
}) {
  const isIn = txn.amount >= 0;
  const typeLabel = txn.type === "AP_PAYMENT" ? "AP Payment" : txn.type === "AR_RECEIPT" ? "AR Receipt" : isIn ? "Receipt" : "Payment";

  return (
    <div
      className={`rounded-lg border p-3 transition-colors duration-150 ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
      } ${txn.matchedId ? "opacity-60" : ""}`}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <button type="button" onClick={selectable ? onSelect : onView} className="min-w-0 flex-1 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{txn.reference}</p>
                  <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                  {txn.outstandingReason ? <Badge variant="secondary" className="text-[10px]">Outstanding</Badge> : null}
                  {txn.matchedId ? <Badge variant="default" className="text-[10px]">Matched</Badge> : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{txn.description}</p>
                <p className="text-xs text-muted-foreground">{formatReconDate(txn.date)}</p>
              </div>
              <p className={`shrink-0 whitespace-nowrap font-mono text-sm tabular-nums ${isIn ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {isIn ? "+" : "−"}{formatMoney(Math.abs(txn.amount), currency)}
              </p>
            </div>
            {txn.outstandingReason ? <p className="mt-1 text-xs text-muted-foreground">{txn.outstandingReason}</p> : null}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            aria-label={`Open ${txn.type === "AP_PAYMENT" ? "payment" : "receipt"} ${txn.reference}`}
          >
            <Icons.Eye className="h-4 w-4" />
          </Button>
        </div>
        {!txn.matchedId && canWrite ? (
          txn.outstandingReason && !leavingOutstanding ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearOutstanding}>
              Clear outstanding
            </Button>
          ) : leavingOutstanding ? (
            <div className="space-y-2">
              <Label htmlFor={`outstanding-${txn.id}`}>Reason this stays outstanding</Label>
              <Textarea id={`outstanding-${txn.id}`} value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={onSaveOutstanding}>Save</Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancelOutstanding}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onStartOutstanding}>
              Leave outstanding
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
