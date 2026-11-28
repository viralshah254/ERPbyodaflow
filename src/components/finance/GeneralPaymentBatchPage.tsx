"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { fetchFinanceAccountsApi, type FinanceAccount } from "@/lib/api/finance";
import { createGeneralPaymentApi, fetchGeneralPaymentsApi, type GeneralPaymentRow } from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import type { BankAccountRow } from "@/lib/types/treasury";
import { parseReceiptMoney } from "@/lib/ar/receipt-money";
import {
  generalBatchTotals,
  instrumentCode,
  likelyDuplicateGeneral,
  rememberedLedgerAccount,
  type GeneralBatchDraft,
  type GeneralBatchLine,
} from "@/lib/finance/general-payment-batch";
import {
  cashBookSetupIssues,
  postFailure,
  isLinkedCashBook,
  paidFromNotLinkedNotice,
  withReturnTo,
} from "@/lib/finance/general-payment-notice";
import { PAYMENT_METHODS, methodLabel, type PaymentMethod } from "@/lib/finance/settlement-batch";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { useCanWriteFinance } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const LIST_HREF = "/ap/general-payments";
const NEW_HREF = "/ap/general-payments/new";
const STORAGE = "erp.gp.batch";

type Settings = { method: PaymentMethod; bankAccountId: string; date: string };

const money = (value: number) => formatMoney(value, "KES");

function codeLabel(method: PaymentMethod): string {
  if (method === "CHEQUE") return "Cheque no.";
  if (method === "MPESA") return "M-Pesa code";
  return "Reference";
}

/** Cost accounts first, then everything else that takes postings. */
function accountRank(account: FinanceAccount): number {
  if (account.type === "EXPENSE") return 0;
  if (account.type === "ASSET") return 1;
  if (account.type === "LIABILITY") return 2;
  return 3;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the batch still works for this visit */
  }
}

function loadBatch(key: string): GeneralBatchLine[] {
  const parsed = readJson<GeneralBatchLine[]>(key);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((line) => typeof line?.payeeName === "string" && typeof line?.ledgerAccountId === "string")
    .map((line) =>
      line.status === "posting"
        ? { ...line, status: "failed" as const, error: "Not confirmed. Check the payments list before posting again." }
        : line,
    );
}

export function GeneralPaymentBatchPage() {
  const router = useRouter();
  const canWrite = useCanWriteFinance();
  const orgId = useAuthStore((s) => s.org?.orgId ?? "");
  const today = todayNairobiYmd();
  const storageKey = `${STORAGE}.${orgId || "org"}`;
  const breadcrumbs = [
    { label: "Finance", href: "/finance" },
    { label: "General Payments", href: LIST_HREF },
    { label: "Record payments" },
  ];

  const [accounts, setAccounts] = React.useState<FinanceAccount[]>([]);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountRow[]>([]);
  const [past, setPast] = React.useState<GeneralPaymentRow[]>([]);
  const [setupLoaded, setSetupLoaded] = React.useState(false);
  const [lines, setLines] = React.useState<GeneralBatchLine[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [settings, setSettings] = React.useState<Settings>({ method: "BANK_TRANSFER", bankAccountId: "", date: today });
  const [posting, setPosting] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });

  const [payee, setPayee] = React.useState("");
  const [ledgerAccountId, setLedgerAccountId] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [code, setCode] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [problem, setProblem] = React.useState("");
  const [confirmDuplicate, setConfirmDuplicate] = React.useState("");

  const payeeRef = React.useRef<HTMLInputElement | null>(null);
  // Changing this opens the account list so the clerk can type straight away.
  const [accountOpenSignal, setAccountOpenSignal] = React.useState("");
  const openAccounts = () => setAccountOpenSignal(crypto.randomUUID());
  const memoRef = React.useRef<HTMLInputElement | null>(null);
  const codeRef = React.useRef<HTMLInputElement | null>(null);
  const amountRef = React.useRef<HTMLInputElement | null>(null);

  const loadSetup = React.useCallback(async () => {
    const [ledger, banks] = await Promise.all([fetchFinanceAccountsApi(), fetchBankAccountsApi()]);
    setAccounts(ledger);
    setBankAccounts(banks);
  }, []);

  React.useEffect(() => {
    loadSetup()
      .catch((e) => toast.error((e as Error).message || "Failed to load accounts."))
      .finally(() => setSetupLoaded(true));
    // Past payees only make suggestions; entry works without them.
    fetchGeneralPaymentsApi()
      .then(setPast)
      .catch(() => setPast([]));
  }, [loadSetup]);

  // The user fixes accounts in another tab; pick the change up when they come back.
  React.useEffect(() => {
    const onFocus = () => {
      void loadSetup().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSetup]);

  React.useEffect(() => {
    const restored = loadBatch(storageKey);
    setLines(restored);
    const saved = readJson<Settings>(`${storageKey}.settings`);
    if (saved) setSettings(restored.length ? saved : { ...saved, date: todayNairobiYmd() });
    setLoaded(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!loaded) return;
    writeJson(storageKey, lines.length ? lines : null);
  }, [lines, loaded, storageKey]);

  React.useEffect(() => {
    if (!loaded) return;
    writeJson(`${storageKey}.settings`, settings);
  }, [settings, loaded, storageKey]);

  const activeBanks = React.useMemo(() => bankAccounts.filter((bank) => bank.active), [bankAccounts]);

  // One paid-from account is almost always the one to use: no need to ask.
  React.useEffect(() => {
    if (!loaded || settings.bankAccountId || activeBanks.length !== 1) return;
    setSettings((current) => ({ ...current, bankAccountId: activeBanks[0]!.id }));
  }, [loaded, settings.bankAccountId, activeBanks]);

  const setupIssues = React.useMemo(() => cashBookSetupIssues({ bankAccounts, accounts }), [bankAccounts, accounts]);

  const ledgerOptions = React.useMemo<Array<{ id: string; label: string; keywords: string }>>(
    () =>
      accounts
        .filter((account) => account.posts !== false)
        .sort((a, b) => accountRank(a) - accountRank(b) || a.code.localeCompare(b.code, undefined, { numeric: true }))
        .map((account) => ({
          id: account.id,
          label: `${account.code} ${account.name}`,
          keywords: `${account.type} ${account.description ?? ""}`,
        })),
    [accounts],
  );

  const bankOptions = React.useMemo(
    () =>
      activeBanks.map((bank) => ({
        id: bank.id,
        label: `${bank.name} (${bank.currency})${isLinkedCashBook(bank) ? "" : " — not linked to a ledger account"}`,
        keywords: `${bank.bank} ${bank.accountNumber}`,
      })),
    [activeBanks],
  );

  // Local lists: the floating select just needs a loader that narrows by every word typed.
  const searchLedger = React.useCallback(
    async (query: string): Promise<AsyncSearchableSelectOption[]> => {
      const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return ledgerOptions
        .filter((option) => {
          const hay = `${option.label} ${option.keywords}`.toLowerCase();
          return tokens.every((token) => hay.includes(token));
        })
        .slice(0, 200)
        .map(({ id, label }) => ({ id, label }));
    },
    [ledgerOptions],
  );
  const searchBanks = React.useCallback(
    async (query: string): Promise<AsyncSearchableSelectOption[]> => {
      const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return bankOptions
        .filter((option) => {
          const hay = `${option.label} ${option.keywords}`.toLowerCase();
          return tokens.every((token) => hay.includes(token));
        })
        .map(({ id, label }) => ({ id, label }));
    },
    [bankOptions],
  );
  const selectedLedger = ledgerOptions.find((option) => option.id === ledgerAccountId) ?? null;
  const selectedBank = bankOptions.find((option) => option.id === settings.bankAccountId) ?? null;

  const payeeSuggestions = React.useMemo(() => {
    const names = new Map<string, string>();
    for (const line of lines) names.set(line.payeeName.toLowerCase(), line.payeeName);
    for (const row of past) if (row.payeeName) names.set(row.payeeName.toLowerCase(), row.payeeName);
    return [...names.values()].sort((a, b) => a.localeCompare(b)).slice(0, 300);
  }, [lines, past]);

  const waiting = lines.filter((line) => line.status === "ready" || line.status === "failed");
  const posted = lines.filter((line) => line.status === "posted");
  const totals = generalBatchTotals(waiting);
  const postedTotal = generalBatchTotals(posted);
  const entered = generalBatchTotals(lines);

  React.useEffect(() => {
    if (!waiting.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [waiting.length]);

  const set = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));

  const clearRow = () => {
    setPayee("");
    setLedgerAccountId("");
    setMemo("");
    setCode("");
    setAmount("");
    setProblem("");
    setConfirmDuplicate("");
    window.setTimeout(() => payeeRef.current?.focus(), 0);
  };

  const rememberAccount = () => {
    if (ledgerAccountId) return;
    const remembered = rememberedLedgerAccount(payee, lines, past);
    if (remembered && ledgerOptions.some((option) => option.id === remembered)) setLedgerAccountId(remembered);
  };

  const add = () => {
    const method = settings.method;
    const bank = activeBanks.find((row) => row.id === settings.bankAccountId);
    const parsed = parseReceiptMoney(amount);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    const focus = (target: React.RefObject<HTMLInputElement | null>) => window.setTimeout(() => target.current?.focus(), 0);

    const fail = (message: string, target?: React.RefObject<HTMLInputElement | null>) => {
      setProblem(message);
      if (target) focus(target);
    };

    if (!settings.date) return fail("Choose the payment date at the top first.");
    if (!bank) return fail("Choose the account the money is paid from at the top first.");
    if (!isLinkedCashBook(bank)) return fail(paidFromNotLinkedNotice(bank.name).message);
    if (!payee.trim()) return fail("Enter who was paid.", payeeRef);
    if (!ledgerAccountId) {
      setProblem("Choose what the payment is for.");
      openAccounts();
      return;
    }
    if (method === "CHEQUE" && !code.trim()) return fail("Enter the cheque number.", codeRef);
    if (method === "MPESA" && !code.trim()) return fail("Enter the M-Pesa transaction code.", codeRef);
    if (!value) return fail("Enter the amount.", amountRef);

    const trimmed = code.trim();
    const draft: GeneralBatchDraft = {
      date: settings.date,
      payeeName: payee.trim(),
      ledgerAccountId,
      ledgerAccountLabel: ledgerOptions.find((option) => option.id === ledgerAccountId)?.label ?? ledgerAccountId,
      memo: memo.trim(),
      amount: value,
      bankAccountId: bank.id,
      bankAccountName: bank.name,
      method,
      chequeNumber: method === "CHEQUE" ? trimmed : "",
      chequeDate: method === "CHEQUE" ? settings.date : "",
      mpesaTransactionNo: method === "MPESA" ? trimmed.toUpperCase() : "",
      reference: method === "CHEQUE" || method === "MPESA" ? "" : trimmed,
    };

    const duplicate = likelyDuplicateGeneral(lines, draft);
    const signature = `${draft.payeeName}|${trimmed}|${value}|${ledgerAccountId}`;
    if (duplicate && confirmDuplicate !== signature) {
      setConfirmDuplicate(signature);
      return fail(
        `Looks like row ${lines.indexOf(duplicate) + 1} (${duplicate.payeeName}, ${money(duplicate.amount)}) again. Press Enter again to add it anyway.`,
        amountRef,
      );
    }

    setLines((current) => [...current, { ...draft, key: crypto.randomUUID(), clientRequestId: crypto.randomUUID(), status: "ready" }]);
    clearRow();
  };

  const edit = (line: GeneralBatchLine) => {
    setSettings({ method: line.method, bankAccountId: line.bankAccountId, date: line.date });
    setPayee(line.payeeName);
    setLedgerAccountId(line.ledgerAccountId);
    setMemo(line.memo);
    setCode(instrumentCode(line));
    setAmount(String(line.amount));
    setProblem("");
    setConfirmDuplicate("");
    setLines((current) => current.filter((row) => row.key !== line.key));
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => amountRef.current?.focus(), 0);
  };

  const postAll = async () => {
    const queue = lines.filter((line) => line.status === "ready" || line.status === "failed");
    if (!queue.length || posting) return;
    setPosting(true);
    setProgress({ done: 0, total: queue.length });
    let ok = 0;
    let failed = 0;
    // One at a time: payment numbers are allocated by the server in order.
    for (const line of queue) {
      setLines((current) =>
        current.map((row) =>
          row.key === line.key ? { ...row, status: "posting", error: undefined, errorTitle: undefined, errorHref: undefined, errorLabel: undefined } : row,
        ),
      );
      try {
        const result = await createGeneralPaymentApi({
          clientRequestId: line.clientRequestId,
          date: line.date,
          payeeName: line.payeeName,
          amount: line.amount,
          bankAccountId: line.bankAccountId,
          ledgerAccountId: line.ledgerAccountId,
          paymentMethod: line.method,
          memo: line.memo || undefined,
          reference: line.reference || undefined,
          chequeNumber: line.method === "CHEQUE" ? line.chequeNumber : undefined,
          chequeDate: line.method === "CHEQUE" ? line.chequeDate : undefined,
          mpesaTransactionNo: line.method === "MPESA" ? line.mpesaTransactionNo : undefined,
        });
        ok += 1;
        setLines((current) =>
          current.map((row) => (row.key === line.key ? { ...row, status: "posted", paymentId: result.id, paymentNumber: result.number } : row)),
        );
      } catch (error) {
        failed += 1;
        const failure = postFailure(error);
        setLines((current) =>
          current.map((row) =>
            row.key === line.key
              ? { ...row, status: "failed", error: failure.message, errorTitle: failure.title, errorHref: failure.href, errorLabel: failure.label }
              : row,
          ),
        );
      }
      setProgress((current) => ({ ...current, done: current.done + 1 }));
    }
    setPosting(false);
    if (failed === 0) toast.success(`${ok} ${ok === 1 ? "payment" : "payments"} posted.`);
    else toast.error(
        `${ok} posted, ${failed} did not post. Each failed row says what went wrong and how to fix it in its Status column. Then press Post again.`,
      );
    fetchGeneralPaymentsApi()
      .then(setPast)
      .catch(() => undefined);
  };

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>, next: () => void) => {
    if (event.key === "Enter") {
      event.preventDefault();
      next();
    } else if (event.key === "Escape") {
      event.preventDefault();
      clearRow();
    }
  };

  if (!canWrite) {
    return (
      <PageShell>
        <PageHeader title="Record general payments" breadcrumbs={breadcrumbs} />
        <p className="text-sm text-muted-foreground">You do not have permission to record general payments.</p>
      </PageShell>
    );
  }

  const chosenBank = activeBanks.find((bank) => bank.id === settings.bankAccountId);
  const needsCode = settings.method === "CHEQUE" || settings.method === "MPESA";

  return (
    <PageShell>
      <PageHeader
        title="Record general payments"
        description="Enter several payments in one sitting: contractors, services, fuel, petty bills, taxes. Nothing posts until you press Post."
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="outline" asChild>
            <Link href={LIST_HREF}>
              <Icons.ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              General Payments
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 pb-28">
        {setupLoaded
          ? setupIssues.map((issue) => (
              <ExceptionBanner
                key={issue.key}
                type={issue.severity}
                title={issue.title}
                description={issue.message}
                actions={[{ label: issue.label, variant: "default", onClick: () => router.push(withReturnTo(issue.href, NEW_HREF)) }]}
              />
            ))
          : null}

        <section aria-label="Fast entry" className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid gap-3 border-b bg-muted/30 px-4 py-3 sm:px-5 md:grid-cols-[auto_minmax(0,1.4fr)_10rem]">
            <div className="space-y-1">
              <Label className="text-xs">Paid by</Label>
              <div role="radiogroup" aria-label="Payment method" className="flex gap-1 rounded-lg border bg-background/60 p-1">
                {PAYMENT_METHODS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={settings.method === option.value}
                    onClick={() => set({ method: option.value })}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      settings.method === option.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Paid from</Label>
              <AsyncSearchableSelect
                value={settings.bankAccountId}
                onValueChange={(id) => set({ bankAccountId: id })}
                loadOptions={searchBanks}
                selectedOption={selectedBank ? { id: selectedBank.id, label: selectedBank.label } : null}
                placeholder="Bank, petty cash or M-Pesa account"
                searchPlaceholder="Find account"
                emptyMessage="No paid-from accounts."
                searchDebounceMs={0}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-fast-date" className="text-xs">
                Date paid
              </Label>
              <Input id="gp-fast-date" type="date" value={settings.date} onChange={(event) => set({ date: event.target.value })} />
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="grid items-end gap-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto]">
              <div className="space-y-1">
                <Label htmlFor="gp-fast-payee" className="text-xs">
                  Paid to
                </Label>
                <Input
                  id="gp-fast-payee"
                  ref={payeeRef}
                  list="gp-fast-payees"
                  autoComplete="off"
                  autoFocus
                  placeholder="Person or business paid"
                  value={payee}
                  onChange={(event) => {
                    setPayee(event.target.value);
                    setProblem("");
                    setConfirmDuplicate("");
                  }}
                  onBlur={rememberAccount}
                  onKeyDown={(event) =>
                    onFieldKey(event, () => {
                      // A payee paid before brings its account back: go straight on to the description.
                      const known = ledgerAccountId || rememberedLedgerAccount(payee, lines, past);
                      rememberAccount();
                      if (known && ledgerOptions.some((option) => option.id === known)) memoRef.current?.focus();
                      else openAccounts();
                    })
                  }
                />
                <datalist id="gp-fast-payees">
                  {payeeSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Paid for (ledger account)</Label>
                <AsyncSearchableSelect
                  value={ledgerAccountId}
                  onValueChange={(id) => {
                    setLedgerAccountId(id);
                    setProblem("");
                    setConfirmDuplicate("");
                  }}
                  onOptionSelect={(option) => {
                    if (option) window.setTimeout(() => memoRef.current?.focus(), 0);
                  }}
                  loadOptions={searchLedger}
                  selectedOption={selectedLedger ? { id: selectedLedger.id, label: selectedLedger.label } : null}
                  placeholder="Type fuel, repairs, contractor…"
                  searchPlaceholder="Search accounts, e.g. fuel, repairs"
                  emptyMessage="No matching account."
                  openSignal={accountOpenSignal}
                  searchDebounceMs={0}
                  minDropdownWidth={380}
                  showDragHandle
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gp-fast-memo" className="text-xs">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="gp-fast-memo"
                  ref={memoRef}
                  autoComplete="off"
                  placeholder="e.g. Roof repair, KBZ 123A fuel"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  onKeyDown={(event) => onFieldKey(event, () => (needsCode ? codeRef : amountRef).current?.focus())}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gp-fast-code" className="text-xs">
                  {codeLabel(settings.method)}
                  {needsCode ? null : <span className="font-normal text-muted-foreground"> (optional)</span>}
                </Label>
                <Input
                  id="gp-fast-code"
                  ref={codeRef}
                  autoComplete="off"
                  inputMode={settings.method === "CHEQUE" ? "numeric" : "text"}
                  className={cn("tabular-nums", settings.method === "MPESA" && "uppercase")}
                  placeholder={needsCode ? "" : "Invoice or voucher"}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setProblem("");
                    setConfirmDuplicate("");
                  }}
                  onKeyDown={(event) => onFieldKey(event, () => amountRef.current?.focus())}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gp-fast-amount" className="text-xs">
                  Amount ({chosenBank?.currency ?? "KES"})
                </Label>
                <Input
                  id="gp-fast-amount"
                  ref={amountRef}
                  inputMode="decimal"
                  autoComplete="off"
                  className="text-right font-medium tabular-nums"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setProblem("");
                    setConfirmDuplicate("");
                  }}
                  onKeyDown={(event) => onFieldKey(event, add)}
                />
              </div>
              <Button type="button" onClick={add} className="h-10">
                <Icons.CornerDownLeft className="mr-2 h-4 w-4" aria-hidden />
                Add
              </Button>
            </div>

            <div className="mt-2 min-h-[1.25rem] text-xs">
              {problem ? (
                <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Icons.AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {problem}
                </p>
              ) : chosenBank && !isLinkedCashBook(chosenBank) ? (
                <p className="text-amber-700 dark:text-amber-400">
                  {chosenBank.name} is not linked to a ledger account yet. Link it in Treasury → Bank accounts, then return here.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Type who was paid and press Enter, then type the account and press Enter to choose it. Enter moves through the rest, and Enter on the amount adds the row. Esc clears the row. A payee you have paid before brings back its last account and skips ahead. Drag the account list by its grip bar to move it.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t bg-muted/20 px-4 py-2.5 text-sm sm:px-5">
            <span>
              <span className="font-semibold tabular-nums">{lines.length}</span>
              <span className="text-muted-foreground"> {lines.length === 1 ? "line" : "lines"} · </span>
              <span className="font-semibold tabular-nums">{money(entered.total)}</span>
              <span className="text-muted-foreground"> entered</span>
            </span>
          </div>
        </section>

        <section aria-label="Payments in this batch" className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">
                Payments to post {waiting.length ? <span className="text-muted-foreground">· {waiting.length}</span> : null}
              </h2>
              <p className="text-xs text-muted-foreground">
                {waiting.length ? `${money(totals.total)} ready to post.` : "Payments you add appear here."}
              </p>
            </div>
            {posted.length ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((line) => line.status !== "posted"))}>
                Clear {posted.length} posted
              </Button>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Icons.Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-medium">No payments yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose how you paid and from which account, then enter who was paid, what for and the amount. Repeat for each voucher.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">Paid to</th>
                    <th className="px-2 py-2 text-left font-medium">For</th>
                    <th className="px-2 py-2 text-left font-medium">Paid by</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                    <th className="w-28 px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...lines].reverse().map((line) => {
                    const locked = line.status === "posted" || line.status === "posting";
                    const ref = instrumentCode(line);
                    return (
                      <tr key={line.key} className={cn("align-top", line.status === "posted" && "text-muted-foreground")}>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{lines.indexOf(line) + 1}</td>
                        <td className="px-2 py-3">
                          <div className="font-medium text-foreground">{line.payeeName}</div>
                          <div className="text-xs text-muted-foreground">{line.date}</div>
                        </td>
                        <td className="px-2 py-3">
                          <div>{line.ledgerAccountLabel}</div>
                          {line.memo ? (
                            <div className="max-w-[18rem] truncate text-xs text-muted-foreground" title={line.memo}>
                              {line.memo}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          <div>{methodLabel(line.method)}{ref ? ` · ${ref}` : ""}</div>
                          <div className="text-xs text-muted-foreground">{line.bankAccountName}</div>
                        </td>
                        <td className="px-2 py-3 text-right font-semibold tabular-nums text-foreground">{money(line.amount)}</td>
                        <td className="px-2 py-3">
                          {line.status === "ready" ? <span className="text-xs text-muted-foreground">Ready</span> : null}
                          {line.status === "posting" ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <Icons.Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Posting
                            </span>
                          ) : null}
                          {line.status === "posted" ? (
                            <Link href={LIST_HREF} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                              <Icons.CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {line.paymentNumber}
                            </Link>
                          ) : null}
                          {line.status === "failed" ? (
                            <div role="alert" className="max-w-[22rem] space-y-1 text-xs">
                              <p className="flex items-center gap-1 font-medium text-destructive">
                                <Icons.AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {line.errorTitle ?? "Not posted"}
                              </p>
                              <p className="text-muted-foreground">{line.error}</p>
                              {line.errorHref && line.errorLabel ? (
                                <p>
                                  <a
                                    href={line.errorHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
                                  >
                                    {line.errorLabel}
                                    <Icons.ExternalLink className="h-3 w-3" aria-hidden />
                                  </a>
                                  <span className="ml-2 text-muted-foreground">Opens in a new tab. Your list is kept. Come back and press Post.</span>
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {!locked ? (
                            <div className="flex justify-end gap-1">
                              <Button type="button" variant="ghost" size="sm" disabled={posting} onClick={() => edit(line)} aria-label={`Edit ${line.payeeName}`}>
                                <Icons.Pencil className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={posting}
                                onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                                aria-label={`Remove ${line.payeeName}`}
                              >
                                <Icons.Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {lines.length > 0 ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">To post </span>
                <span className="text-lg font-semibold tabular-nums">{money(totals.total)}</span>
                <span className="text-muted-foreground"> in {totals.count} {totals.count === 1 ? "payment" : "payments"}</span>
              </span>
              {posted.length ? (
                <span className="text-muted-foreground">
                  Posted {money(postedTotal.total)} ({postedTotal.count})
                </span>
              ) : null}
            </div>
            <Button type="button" size="lg" onClick={postAll} disabled={posting || waiting.length === 0}>
              {posting ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Icons.Send className="mr-2 h-4 w-4" aria-hidden />}
              {posting
                ? `Posting ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                : `Post ${waiting.length || ""} ${waiting.length === 1 ? "payment" : "payments"}`}
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
