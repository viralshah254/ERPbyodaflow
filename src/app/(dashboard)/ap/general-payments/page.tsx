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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchFinanceAccountsApi, type FinanceAccount } from "@/lib/api/finance";
import { fetchGeneralPaymentsApi, type GeneralPaymentMethod, type GeneralPaymentRow } from "@/lib/api/payments";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import type { BankAccountRow } from "@/lib/types/treasury";
import { downloadCsv } from "@/lib/export/csv";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { useCanWriteFinance } from "@/lib/rbac/use-write-guard";
import { cashBookSetupIssues, withReturnTo } from "@/lib/finance/general-payment-notice";

const METHOD_LABEL: Record<GeneralPaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  MPESA: "M-Pesa",
};

export default function GeneralPaymentsPage() {
  const router = useRouter();
  const canWrite = useCanWriteFinance();
  const [rows, setRows] = React.useState<GeneralPaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<GeneralPaymentRow | null>(null);
  const [accounts, setAccounts] = React.useState<FinanceAccount[]>([]);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccountRow[]>([]);

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

  const setupIssues = React.useMemo(() => cashBookSetupIssues({ bankAccounts, accounts }), [bankAccounts, accounts]);

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
              <Button asChild>
                <Link href="/ap/general-payments/new">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Record payments
                </Link>
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
