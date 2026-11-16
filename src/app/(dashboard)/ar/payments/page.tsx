"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import type { PaymentRow } from "@/lib/types/ar";
import { CustomerLink } from "@/components/customers/CustomerLink";
import {
  downloadArReceiptPdfApi,
  fetchArPaymentsPageApi,
  submitArPaymentApi,
} from "@/lib/api/payments";
import { ArStatementReviewSheet } from "@/components/finance/ArStatementReviewSheet";
import { ArChequeBatchSheet } from "@/components/finance/ArChequeBatchSheet";
import type { BankAccountRow } from "@/lib/types/treasury";
import { ArReconciliationSheet } from "@/components/finance/ArReconciliationSheet";
import { ArSettlementSheet, type ReceivePrefill } from "@/components/finance/ArSettlementSheet";
import { fetchBankAccountsApi } from "@/lib/api/treasury-ops";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { formatActivityExact } from "@/lib/format/nairobi-datetime";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { DocumentHubUploadButton } from "@/components/documents/DocumentHubUploadButton";
import { isFmcgTemplateId } from "@/lib/fmcg/sfa-customer";
import { useOrgContextStore } from "@/stores/orgContextStore";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

function methodDetail(row: PaymentRow): string {
  if (row.paymentMethod === "CHEQUE") {
    return ["Cheque", row.chequeNumber, row.chequeDate].filter(Boolean).join(" · ");
  }
  if (row.paymentMethod === "MPESA") return row.mpesaTransactionNo ? `M-Pesa ${row.mpesaTransactionNo}` : "M-Pesa";
  if (row.paymentMethod === "CASH") return "Cash";
  return row.bankAccountName || row.reference || "Bank transfer";
}

function appliedSummary(row: PaymentRow): string {
  const numbers = [...new Set((row.allocations ?? []).map((line) => line.documentNumber || line.documentId).filter(Boolean))];
  return numbers.length ? numbers.join(", ") : "—";
}

import { useHasPermission } from "@/lib/rbac/use-write-guard";

export default function ARPaymentsPage() {
  const canReviewStatements = useHasPermission("finance.bank.read");
  const canRecord = useHasPermission("finance.write", "finance.receipts.write");
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = useOrgContextStore((s) => s.templateId);
  const issueReceipt = isFmcgTemplateId(templateId);
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [searchInput, setSearchInput] = React.useState(() => searchParams.get("paymentSearch") ?? "");
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchInput);
  const [pendingAdviceId, setPendingAdviceId] = React.useState(() => searchParams.get("adviceId") ?? "");
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receiveSession, setReceiveSession] = React.useState(0);
  const [receivePrefill, setReceivePrefill] = React.useState<ReceivePrefill | null>(null);
  const statementReference = searchParams.get("statementReference") || undefined;
  const [statementOpen, setStatementOpen] = React.useState(() => Boolean(statementReference));
  const [batchOpen, setBatchOpen] = React.useState(() => searchParams.has("adviceId"));
  const [batchPayment, setBatchPayment] = React.useState<PaymentRow>();
  const [selectedPaymentId, setSelectedPaymentId] = React.useState<string | null>(() => searchParams.get("reconcile"));
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = React.useState<BankAccountRow[]>([]);
  const openedFromQuery = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchArPaymentsPageApi({
          limit: pageSize,
          cursor: String(offset),
          search: debouncedSearch || undefined,
        });
        setPayments(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error((error as Error).message || "Failed to load AR payments.");
        setPayments([]);
        setHasMore(false);
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, pageSize]
  );

  const refreshData = React.useCallback(async () => {
    await loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const goToPreviousPage = React.useCallback(() => {
    void loadPage(Math.max(0, pageOffset - pageSize));
  }, [loadPage, pageOffset, pageSize]);

  const goToNextPage = React.useCallback(() => {
    void loadPage(pageOffset + pageSize);
  }, [loadPage, pageOffset, pageSize]);

  React.useEffect(() => {
    fetchBankAccountsApi()
      .then(setBankAccountOptions)
      .catch(() => setBankAccountOptions([]));
  }, []);

  const openReceive = React.useCallback((prefill: ReceivePrefill | null) => {
    setReceivePrefill(prefill);
    setReceiveSession((value) => value + 1);
    setReceiveOpen(true);
  }, []);

  React.useEffect(() => {
    if (openedFromQuery.current) return;
    if (searchParams.get("receive") !== "1") return;
    const customerId = searchParams.get("customerId")?.trim();
    if (!customerId) return;
    openedFromQuery.current = true;
    const amount = Number(searchParams.get("amount"));
    openReceive({
      customerId,
      customerName: searchParams.get("customerName")?.trim() || customerId,
      invoiceNumber: searchParams.get("invoiceNumber")?.trim() || undefined,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    });
  }, [openReceive, searchParams]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: PaymentRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      {
        id: "date",
        header: "Date",
        accessor: (r: PaymentRow) => (
          <span className="tabular-nums text-sm">{formatActivityExact(r.date) || "—"}</span>
        ),
      },
      {
        id: "customerName",
        header: "Customer",
        accessor: (r: PaymentRow) => <CustomerLink id={r.customerId} name={r.customerName} />,
      },
      {
        id: "amount",
        header: "Amount",
        accessor: (r: PaymentRow) => formatMoney(r.amount, "KES"),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PaymentRow) => (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
            {r.status}
          </span>
        ),
      },
      {
        id: "methodDetail",
        header: "Method",
        accessor: (r: PaymentRow) => methodDetail(r),
      },
      {
        id: "applied",
        header: "Applied to",
        accessor: (r: PaymentRow) => appliedSummary(r),
      },
      {
        id: "unapplied",
        header: "Unapplied",
        accessor: (r: PaymentRow) => formatMoney(r.openAmount ?? 0, "KES"),
      },
      {
        id: "actions",
        header: "",
        accessor: (r: PaymentRow) => (
          <div className="flex gap-1">
            {canRecord && r.status === "DRAFT" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={submittingId === r.id}
                onClick={async () => {
                  setSubmittingId(r.id);
                  try {
                    await submitArPaymentApi(r.id);
                    await refreshData();
                    toast.success(`Payment ${r.number} submitted.`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              >
                {submittingId === r.id ? "Submitting…" : "Submit"}
              </Button>
            )}
            {canRecord && (r.status === "POSTED" || r.status === "ALLOCATED") && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentId(r.id)}>
                Reconcile
              </Button>
            )}
            {canRecord && r.paymentMethod === "CHEQUE" && (r.status === "POSTED" || r.status === "ALLOCATED") && (
              <Button variant="ghost" size="sm" onClick={() => { setBatchPayment(r); setBatchOpen(true); }}>
                Reconcile with advice
              </Button>
            )}
            {issueReceipt && (r.status === "POSTED" || r.status === "ALLOCATED") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void downloadArReceiptPdfApi(r.id, `${r.number}.pdf`, (message) => toast.error(message));
                }}
              >
                Receipt
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canRecord, issueReceipt, refreshData, submittingId]
  );

  const handleDraftReminder = () => {
    openWithPrompt(
      "Draft a payment reminder for the overdue invoices on this customer's account. Include invoice numbers, amounts, and the due dates."
    );
  };

  const clearPendingAdvice = () => {
    setPendingAdviceId("");
    if (!searchParams.has("adviceId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("adviceId");
    next.delete("paymentSearch");
    const query = next.toString();
    router.replace(query ? `/ar/payments?${query}` : "/ar/payments", { scroll: false });
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="AR Payments"
        description="Receive payments and allocate to invoices"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AR Payments" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap gap-2">
            {canReviewStatements && <Button variant="outline" onClick={() => setStatementOpen(true)}>Statements & matching</Button>}
            {canRecord && <DocumentHubUploadButton label="Scan cheque" />}
            {copilotEnabled ? (
              <Button variant="outline" size="sm" onClick={handleDraftReminder}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Draft payment reminder
              </Button>
            ) : null}
            {canRecord && <Button variant="outline" onClick={() => { setBatchPayment(undefined); setBatchOpen(true); }}>Reconcile cheques</Button>}
            <Button variant="outline" asChild>
              <Link href="/ar/receipts">Collect receipts</Link>
            </Button>
            {canRecord && <Button onClick={() => openReceive(null)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Receive Payment
            </Button>}
          </div>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <DataTableToolbar
          className="shrink-0"
          searchPlaceholder="Search by number, customer..."
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onExport={() =>
            downloadCsv(
              `ar-payments-${new Date().toISOString().slice(0, 10)}.csv`,
              payments.map((row) => ({
                number: row.number,
                date: formatActivityExact(row.date) || row.date,
                customerName: row.customerName,
                amount: row.amount,
                status: row.status,
                method: methodDetail(row),
                appliedTo: appliedSummary(row),
                unapplied: row.openAmount ?? 0,
              }))
            )
          }
        />
        {initialLoading ? (
          <SkeletonDataTable
            rows={pageSize}
            columnWidths={["w-28", "w-28", "w-40", "w-28", "w-24", "w-40", "w-36", "w-28", "w-20"]}
          />
        ) : (
          <>
            <TableLinearProgress active={fetching} />
            <DataTable<PaymentRow> dataScope="page"
              data={payments}
              columns={columns}
              emptyMessage="No payments yet."
              scrollMode="natural"
              size="comfortable" searchable={false}
            />
            <TablePagination
              pageOffset={pageOffset}
              pageSize={pageSize}
              itemCount={payments.length}
              hasMore={hasMore}
              loading={initialLoading}
              busy={fetching}
              entityLabel="payments"
              sticky
              onPrevious={goToPreviousPage}
              onNext={goToNextPage}
              pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {canReviewStatements && statementOpen && <ArStatementReviewSheet
        accounts={bankAccountOptions} initialReference={statementReference} onClose={() => setStatementOpen(false)}
        onSaved={() => { void refreshData(); }} />}
      <ArSettlementSheet
        open={canRecord && receiveOpen}
        sessionKey={receiveSession}
        prefill={receivePrefill}
        bankAccounts={bankAccountOptions}
        onOpenChange={setReceiveOpen}
        onPosted={() => {
          void refreshData();
        }}
      />
      {canRecord && batchOpen && (
        <ArChequeBatchSheet
          initialPayment={batchPayment}
          initialAdviceId={pendingAdviceId || undefined}
          bankAccounts={bankAccountOptions}
          onClose={() => { setBatchOpen(false); clearPendingAdvice(); }}
          onSaved={() => { clearPendingAdvice(); void refreshData(); }}
        />
      )}
      {canRecord && selectedPaymentId && (
        <ArReconciliationSheet
          key={selectedPaymentId}
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
          onSaved={() => {
            clearPendingAdvice();
            setSelectedPaymentId(null);
            void refreshData();
          }}
        />
      )}
    </PageShell>
  );
}
