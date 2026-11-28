"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchFinanceAccountsApi, type FinanceAccount } from "@/lib/api/finance";
import {
  createGeneralPaymentApi,
  fetchGeneralPaymentsApi,
  type GeneralPaymentMethod,
  type GeneralPaymentRow,
} from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import type { BankAccountRow } from "@/lib/types/treasury";
import { downloadCsv } from "@/lib/export/csv";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { useCanWriteFinance } from "@/lib/rbac/use-write-guard";
import {
  cashBookSetupIssues,
  generalPaymentNotice,
  isLinkedCashBook,
  paidFromNotLinkedNotice,
  withReturnTo,
  type GuidedNotice,
} from "@/lib/finance/general-payment-notice";

const METHODS: Array<{ id: GeneralPaymentMethod; label: string }> = [
  { id: "BANK_TRANSFER", label: "Bank transfer" },
  { id: "CHEQUE", label: "Cheque" },
  { id: "CASH", label: "Cash" },
  { id: "MPESA", label: "M-Pesa" },
];

const METHOD_LABEL = Object.fromEntries(METHODS.map((method) => [method.id, method.label])) as Record<GeneralPaymentMethod, string>;

type Form = {
  date: string;
  payeeName: string;
  ledgerAccountId: string;
  memo: string;
  amount: string;
  bankAccountId: string;
  paymentMethod: GeneralPaymentMethod;
  chequeNumber: string;
  chequeDate: string;
  mpesaTransactionNo: string;
  reference: string;
};

function blankForm(bankAccountId = ""): Form {
  return {
    date: todayNairobiYmd(),
    payeeName: "",
    ledgerAccountId: "",
    memo: "",
    amount: "",
    bankAccountId,
    paymentMethod: "BANK_TRANSFER",
    chequeNumber: "",
    chequeDate: todayNairobiYmd(),
    mpesaTransactionNo: "",
    reference: "",
  };
}

function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Cost accounts first, then everything else that takes postings. */
function accountRank(account: FinanceAccount): number {
  if (account.type === "EXPENSE") return 0;
  if (account.type === "ASSET") return 1;
  if (account.type === "LIABILITY") return 2;
  return 3;
}

type FormNotice = Partial<GuidedNotice> & { message: string };

function formProblem(form: Form, banks: BankAccountRow[]): FormNotice | null {
  if (!form.date) return { message: "Enter the payment date." };
  if (!form.payeeName.trim()) return { message: "Enter who was paid." };
  if (!form.ledgerAccountId) return { message: "Choose what the payment is for." };
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { message: "Enter the amount." };
  if (!form.bankAccountId) return { message: "Choose the account the money was paid from." };
  const bank = banks.find((row) => row.id === form.bankAccountId);
  if (bank && !isLinkedCashBook(bank)) return paidFromNotLinkedNotice(bank.name);
  if (form.paymentMethod === "CHEQUE") {
    if (!form.chequeNumber.trim()) return { message: "Enter the cheque number." };
    if (!form.chequeDate) return { message: "Enter the cheque date." };
  }
  if (form.paymentMethod === "MPESA" && !form.mpesaTransactionNo.trim()) return { message: "Enter the M-Pesa transaction code." };
  return null;
}

/** Opens in a new tab so a half-filled payment is not lost while the user fixes the setup. */
function SetupLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
    >
      {children}
      <Icons.ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

export default function GeneralPaymentsPage() {
  const router = useRouter();
  const canWrite = useCanWriteFinance();
  const [rows, setRows] = React.useState<GeneralPaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<GeneralPaymentRow | null>(null);
  const [accounts, setAccounts] = React.useState<FinanceAccount[]>([]);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountRow[]>([]);
  const [form, setForm] = React.useState<Form>(blankForm());
  const [requestId, setRequestId] = React.useState(newRequestId);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<FormNotice | null>(null);

  const refresh = React.useCallback(async () => {
    setRows(await fetchGeneralPaymentsApi());
  }, []);

  const loadSetup = React.useCallback(async () => {
    const [ledger, banks] = await Promise.all([fetchFinanceAccountsApi(), fetchBankAccountsApi()]);
    setAccounts(ledger);
    setBankAccounts(banks);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchGeneralPaymentsApi(), loadSetup()])
      .then(([payments]) => setRows(payments))
      .catch((e) => toast.error((e as Error).message || "Failed to load general payments."))
      .finally(() => setLoading(false));
  }, [loadSetup]);

  // The user fixes accounts in another tab; pick the change up when they come back.
  React.useEffect(() => {
    const onFocus = () => {
      void loadSetup().catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSetup]);

  const activeBankAccounts = React.useMemo(() => bankAccounts.filter((bank) => bank.active), [bankAccounts]);
  const setupIssues = React.useMemo(() => cashBookSetupIssues({ bankAccounts, accounts }), [bankAccounts, accounts]);

  const ledgerOptions = React.useMemo(
    () =>
      accounts
        .filter((account) => account.posts !== false)
        .sort((a, b) => accountRank(a) - accountRank(b) || a.code.localeCompare(b.code, undefined, { numeric: true }))
        .map((account) => ({
          id: account.id,
          label: `${account.code} ${account.name}`,
          keywords: `${account.type} ${account.description ?? ""}`,
        })),
    [accounts]
  );
  const bankOptions = React.useMemo(
    () =>
      activeBankAccounts.map((bank) => ({
        id: bank.id,
        label: `${bank.name} (${bank.currency})${isLinkedCashBook(bank) ? "" : " — not linked to a ledger account"}`,
        keywords: `${bank.bank} ${bank.accountNumber}`,
      })),
    [activeBankAccounts]
  );
  const chosenBank = activeBankAccounts.find((bank) => bank.id === form.bankAccountId);
  const currency = chosenBank?.currency ?? "KES";

  const patch = (next: Partial<Form>) => {
    setError(null);
    setForm((current) => ({ ...current, ...next }));
  };

  const openForm = () => {
    // Keep the last paid-from account when there is only one choice: it is almost always the same.
    setForm(blankForm(activeBankAccounts.length === 1 ? activeBankAccounts[0]!.id : ""));
    setRequestId(newRequestId());
    setError(null);
    setOpen(true);
  };

  const save = async (addAnother: boolean) => {
    const problem = formProblem(form, bankAccounts);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createGeneralPaymentApi({
        clientRequestId: requestId,
        date: form.date,
        payeeName: form.payeeName.trim(),
        amount: Number(form.amount),
        bankAccountId: form.bankAccountId,
        ledgerAccountId: form.ledgerAccountId,
        paymentMethod: form.paymentMethod,
        memo: form.memo.trim() || undefined,
        reference: form.reference.trim() || undefined,
        chequeNumber: form.paymentMethod === "CHEQUE" ? form.chequeNumber.trim() : undefined,
        chequeDate: form.paymentMethod === "CHEQUE" ? form.chequeDate : undefined,
        mpesaTransactionNo: form.paymentMethod === "MPESA" ? form.mpesaTransactionNo.trim() : undefined,
      });
      toast.success(`Payment ${result.number} recorded.`);
      setRequestId(newRequestId());
      if (addAnother) {
        // Keep date, paid-from account and method: batches of vouchers usually share them.
        setForm((current) => ({
          ...blankForm(current.bankAccountId),
          date: current.date,
          paymentMethod: current.paymentMethod,
          chequeDate: current.chequeDate,
        }));
      } else {
        setOpen(false);
      }
      try {
        await refresh();
      } catch {
        toast.error("Payment was recorded, but the list could not refresh. Reload the page before entering it again.");
      }
    } catch (e) {
      setError(generalPaymentNotice(e) ?? { message: (e as Error).message || "Could not record this payment." });
    } finally {
      setSaving(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.number, row.payeeName, row.memo, row.reference, row.chequeNumber, row.mpesaTransactionNo, row.ledgerAccountName, row.ledgerAccountCode, row.bankAccountName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: GeneralPaymentRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "date", header: "Date", accessor: (r: GeneralPaymentRow) => r.date },
      { id: "payee", header: "Paid to", accessor: (r: GeneralPaymentRow) => r.payeeName || "—" },
      {
        id: "ledger",
        header: "For",
        accessor: (r: GeneralPaymentRow) => (
          <span className="block max-w-[18rem] truncate" title={r.memo || undefined}>
            {r.ledgerAccountName ?? "—"}
            {r.memo ? <span className="text-muted-foreground"> · {r.memo}</span> : null}
          </span>
        ),
      },
      { id: "from", header: "Paid from", accessor: (r: GeneralPaymentRow) => r.bankAccountName ?? "—" },
      { id: "method", header: "Method", accessor: (r: GeneralPaymentRow) => (r.paymentMethod ? METHOD_LABEL[r.paymentMethod] : "—") },
      {
        id: "ref",
        header: "Reference",
        accessor: (r: GeneralPaymentRow) => r.chequeNumber || r.mpesaTransactionNo || r.reference || "—",
      },
      { id: "amount", header: "Amount", accessor: (r: GeneralPaymentRow) => formatMoney(r.amount, r.currency || "KES") },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="General Payments"
        description="Payments that are not for supplier bills: contractors, services, fuel, petty bills, taxes"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "General Payments" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/payments">
                <Icons.CreditCard className="mr-2 h-4 w-4" />
                Supplier payments
              </Link>
            </Button>
            {canWrite ? (
              <Button onClick={openForm}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                New payment
              </Button>
            ) : null}
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        {!loading && canWrite
          ? setupIssues.map((issue) => (
              <ExceptionBanner
                key={issue.key}
                type={issue.severity}
                title={issue.title}
                description={issue.message}
                actions={[{ label: issue.label, variant: "default", onClick: () => router.push(withReturnTo(issue.href)) }]}
              />
            ))
          : null}
        <DataTableToolbar
          className="shrink-0"
          searchPlaceholder="Search by number, payee, description, reference…"
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `general-payments-${todayNairobiYmd()}.csv`,
              filtered.map((row) => ({
                number: row.number,
                date: row.date,
                paidTo: row.payeeName,
                account: row.ledgerAccountName ? `${row.ledgerAccountCode ?? ""} ${row.ledgerAccountName}`.trim() : "",
                description: row.memo,
                paidFrom: row.bankAccountName ?? "",
                method: row.paymentMethod ?? "",
                reference: row.chequeNumber || row.mpesaTransactionNo || row.reference || "",
                currency: row.currency,
                amount: row.amount,
              }))
            )
          }
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <DataTable<GeneralPaymentRow>
            data={filtered}
            columns={columns}
            emptyMessage="No general payments yet."
            onRowClick={(row) => setSelected(row)}
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
            searchable={false}
          />
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading general payments…</p> : null}
      </div>

      <Sheet open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>New general payment</SheetTitle>
            <SheetDescription>
              Record money paid out that is not for stock bought from a supplier. It posts to the account you choose and reduces the account it was paid from.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gp-date">Payment date</Label>
                <Input id="gp-date" type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gp-amount">Amount ({currency})</Label>
                <Input
                  id="gp-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => patch({ amount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gp-payee">Paid to</Label>
              <Input
                id="gp-payee"
                placeholder="Person or business paid, e.g. contractor, fuel station"
                value={form.payeeName}
                onChange={(e) => patch({ payeeName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Paid for (ledger account)</Label>
              <SearchableSelect
                value={form.ledgerAccountId}
                onValueChange={(value) => patch({ ledgerAccountId: value })}
                options={ledgerOptions}
                placeholder="Choose expense or ledger account"
                searchPlaceholder="Search accounts, e.g. fuel, repairs, contractor"
              />
              {accounts.length > 0 && !ledgerOptions.length ? (
                <p className="text-xs text-muted-foreground">
                  No accounts can take payments yet. Add expense accounts in <SetupLink href="/finance/chart-of-accounts">Finance → Chart of accounts</SetupLink>.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Can&apos;t find the account? Add it in <SetupLink href="/finance/chart-of-accounts">Finance → Chart of accounts</SetupLink>.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gp-memo">Description</Label>
              <Textarea
                id="gp-memo"
                rows={2}
                placeholder="What was this payment for? e.g. Roof repair contract, KBZ 123A fuel"
                value={form.memo}
                onChange={(e) => patch({ memo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Paid from</Label>
              <SearchableSelect
                value={form.bankAccountId}
                onValueChange={(value) => patch({ bankAccountId: value })}
                options={bankOptions}
                placeholder="Bank, petty cash or M-Pesa account"
                searchPlaceholder="Search accounts"
              />
              {!activeBankAccounts.length ? (
                <p className="text-xs text-muted-foreground">
                  No paid-from accounts yet. Add your bank, petty cash or M-Pesa account in <SetupLink href="/treasury/bank-accounts">Treasury → Bank accounts</SetupLink> and link it to its ledger account.
                </p>
              ) : chosenBank && !isLinkedCashBook(chosenBank) ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {chosenBank.name} is not linked to a ledger account yet. Link it in <SetupLink href="/treasury/bank-accounts">Treasury → Bank accounts</SetupLink>, then return here.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gp-method">Payment method</Label>
              <select
                id="gp-method"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.paymentMethod}
                onChange={(e) => patch({ paymentMethod: e.target.value as GeneralPaymentMethod })}
              >
                {METHODS.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            {form.paymentMethod === "CHEQUE" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gp-cheque">Cheque number</Label>
                  <Input id="gp-cheque" value={form.chequeNumber} onChange={(e) => patch({ chequeNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gp-cheque-date">Cheque date</Label>
                  <Input id="gp-cheque-date" type="date" value={form.chequeDate} onChange={(e) => patch({ chequeDate: e.target.value })} />
                </div>
              </div>
            ) : null}
            {form.paymentMethod === "MPESA" ? (
              <div className="space-y-2">
                <Label htmlFor="gp-mpesa">M-Pesa transaction code</Label>
                <Input id="gp-mpesa" value={form.mpesaTransactionNo} onChange={(e) => patch({ mpesaTransactionNo: e.target.value })} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="gp-ref">Reference (optional)</Label>
              <Input
                id="gp-ref"
                placeholder="Invoice, voucher or bank reference"
                value={form.reference}
                onChange={(e) => patch({ reference: e.target.value })}
              />
            </div>
            {error ? (
              <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                {error.title ? <p className="font-medium text-destructive">{error.title}</p> : null}
                <p className="text-destructive">{error.message}</p>
                {error.href && error.label ? (
                  <p>
                    <SetupLink href={error.href}>{error.label}</SetupLink>
                    <span className="ml-2 text-xs text-muted-foreground">Opens in a new tab. Your entries here are kept.</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <SheetFooter className="mt-6 gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void save(true)} disabled={saving}>
                Save &amp; add another
              </Button>
              <Button onClick={() => void save(false)} disabled={saving}>
                {saving ? "Saving…" : "Save payment"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!selected} onOpenChange={(next) => !next && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px]">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.number}</SheetTitle>
                <SheetDescription>General payment details</SheetDescription>
              </SheetHeader>
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ["Date", selected.date],
                    ["Amount", formatMoney(selected.amount, selected.currency || "KES")],
                    ["Paid to", selected.payeeName || "—"],
                    ["Paid for", selected.ledgerAccountName ? `${selected.ledgerAccountCode ?? ""} ${selected.ledgerAccountName}`.trim() : "—"],
                    ["Paid from", selected.bankAccountName ?? "—"],
                    ["Method", selected.paymentMethod ? METHOD_LABEL[selected.paymentMethod] : "—"],
                    ["Cheque no.", selected.chequeNumber || "—"],
                    ["M-Pesa code", selected.mpesaTransactionNo || "—"],
                    ["Reference", selected.reference || "—"],
                    ["Status", selected.status],
                  ] as Array<[string, string]>
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="font-medium">{selected.memo || "—"}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
