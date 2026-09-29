"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchDocumentListApi } from "@/lib/api/documents";
import { fetchArPaymentsApi, fetchOpenInvoicesApi } from "@/lib/api/payments";
import type { DocListRow } from "@/lib/types/documents";
import type { OpenInvoiceRow, PaymentRow } from "@/lib/types/ar";
import { formatMoney } from "@/lib/money";
import { formatActivityExact, formatActivityWhen, formatDueWhen } from "@/lib/format/nairobi-datetime";

const NOT_ISSUED = new Set(["DRAFT", "PENDING_APPROVAL", "APPROVED"]);
const SKIPPED = new Set(["CANCELLED", "REJECTED", "VOID"]);
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export type CustomerActivity = {
  loading: boolean;
  orders: DocListRow[];
  deliveries: DocListRow[];
  invoices: DocListRow[];
  creditNotes: DocListRow[];
  openInvoices: OpenInvoiceRow[] | null;
  payments: PaymentRow[] | null;
};

const EMPTY_ACTIVITY: CustomerActivity = {
  loading: true,
  orders: [],
  deliveries: [],
  invoices: [],
  creditNotes: [],
  openInvoices: null,
  payments: null,
};

function byDateDesc(a: { date: string; createdAt?: string }, b: { date: string; createdAt?: string }) {
  return String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date));
}

export function useCustomerActivity(partyId: string, canReadAr: boolean): CustomerActivity {
  const [activity, setActivity] = React.useState<CustomerActivity>(EMPTY_ACTIVITY);

  React.useEffect(() => {
    if (!partyId) return;
    let cancelled = false;
    setActivity({ ...EMPTY_ACTIVITY, loading: true });
    Promise.all([
      fetchDocumentListApi("sales-order", { partyId }).catch(() => [] as DocListRow[]),
      fetchDocumentListApi("delivery-note", { partyId }).catch(() => [] as DocListRow[]),
      fetchDocumentListApi("invoice", { partyId }).catch(() => [] as DocListRow[]),
      fetchDocumentListApi("credit-note", { partyId }).catch(() => [] as DocListRow[]),
      canReadAr ? fetchOpenInvoicesApi(partyId).catch(() => null) : Promise.resolve(null),
      canReadAr ? fetchArPaymentsApi(partyId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([orders, deliveries, invoices, creditNotes, openInvoices, payments]) => {
        if (cancelled) return;
        setActivity({
          loading: false,
          orders: [...orders].sort(byDateDesc),
          deliveries: [...deliveries].sort(byDateDesc),
          invoices: [...invoices].sort(byDateDesc),
          creditNotes: [...creditNotes].sort(byDateDesc),
          openInvoices: openInvoices ? [...openInvoices].sort(byDateDesc) : null,
          payments: payments
            ? [...payments].filter((row) => row.customerId === partyId).sort(byDateDesc)
            : null,
        });
      })
      .catch(() => {
        if (!cancelled) setActivity((prev) => ({ ...prev, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [canReadAr, partyId]);

  return activity;
}

function money(amount: number | undefined, currency?: string) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return formatMoney(amount, currency || "KES");
}

function When({ value }: { value?: string | null }) {
  const label = formatActivityWhen(value);
  const exact = formatActivityExact(value);
  return (
    <span title={exact || undefined} className="whitespace-nowrap">
      {label}
    </span>
  );
}

function useClientPage<T extends { id: string }>(rows: T[]) {
  const [pageSize, setPageSize] = React.useState(10);
  const [pageOffset, setPageOffset] = React.useState(0);
  const signature = `${rows.length}:${rows[0]?.id ?? ""}:${rows[rows.length - 1]?.id ?? ""}`;

  React.useEffect(() => {
    setPageOffset(0);
  }, [signature, pageSize]);

  const safeOffset = Math.min(pageOffset, Math.max(0, rows.length - 1));
  const start = rows.length === 0 ? 0 : safeOffset;
  const page = rows.slice(start, start + pageSize);

  return {
    page,
    pageOffset: start,
    pageSize,
    hasMore: start + pageSize < rows.length,
    totalCount: rows.length,
    onPrevious: () => setPageOffset((offset) => Math.max(0, offset - pageSize)),
    onNext: () => setPageOffset((offset) => offset + pageSize),
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setPageOffset(0);
    },
  };
}

function PagedFrame({
  children,
  pager,
  entityLabel,
}: {
  children: React.ReactNode;
  pager: ReturnType<typeof useClientPage<{ id: string }>>;
  entityLabel: string;
}) {
  if (pager.totalCount === 0) return <>{children}</>;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {children}
      <TablePagination
        className="rounded-none border-0 border-t shadow-none"
        pageOffset={pager.pageOffset}
        pageSize={pager.pageSize}
        itemCount={pager.page.length}
        hasMore={pager.hasMore}
        totalCount={pager.totalCount}
        entityLabel={entityLabel}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={pager.onPageSizeChange}
        onPrevious={pager.onPrevious}
        onNext={pager.onNext}
      />
    </div>
  );
}

function ActivityTable({
  rows,
  empty,
  docType,
  entityLabel,
  extra,
}: {
  rows: DocListRow[];
  empty: string;
  docType: string;
  entityLabel: string;
  extra?: (row: DocListRow) => React.ReactNode;
}) {
  const router = useRouter();
  const pager = useClientPage(rows);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <PagedFrame pager={pager} entityLabel={entityLabel}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            {extra ? <TableHead /> : null}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pager.page.map((row) => {
            const href = `/docs/${docType}/${row.id}`;
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(href);
                }}
              >
                <TableCell>
                  <When value={row.createdAt || row.date} />
                </TableCell>
                <TableCell className="font-medium">{row.number}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                {extra ? <TableCell>{extra(row)}</TableCell> : null}
                <TableCell className="text-right">{money(row.total, row.currency)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PagedFrame>
  );
}

export function CustomerOrdersPanel({ activity }: { activity: CustomerActivity }) {
  if (activity.loading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Orders</h2>
        <ActivityTable
          rows={activity.orders}
          empty="No orders for this customer yet."
          docType="sales-order"
          entityLabel="orders"
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Deliveries</h2>
        <ActivityTable
          rows={activity.deliveries}
          empty="No deliveries for this customer yet."
          docType="delivery-note"
          entityLabel="deliveries"
        />
      </section>
    </div>
  );
}

function InvoiceRows({
  rows,
  empty,
  entityLabel,
  status,
}: {
  rows: Array<DocListRow | OpenInvoiceRow>;
  empty: string;
  entityLabel: string;
  status: (row: DocListRow | OpenInvoiceRow) => React.ReactNode;
}) {
  const router = useRouter();
  const pager = useClientPage(rows);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const showDue = rows.some((row) => "dueDate" in row && row.dueDate);
  const showOutstanding = rows.some((row) => "outstanding" in row);
  return (
    <PagedFrame pager={pager} entityLabel={entityLabel}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Invoice</TableHead>
            {showDue ? <TableHead>Due</TableHead> : null}
            <TableHead>Status</TableHead>
            {showOutstanding ? <TableHead className="text-right">Outstanding</TableHead> : null}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pager.page.map((row) => {
            const href = `/docs/invoice/${row.id}`;
            const due = "dueDate" in row ? row.dueDate : undefined;
            const outstanding = "outstanding" in row ? row.outstanding : undefined;
            const when = "createdAt" in row && row.createdAt ? row.createdAt : row.date;
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(href);
                }}
              >
                <TableCell>
                  <When value={when} />
                </TableCell>
                <TableCell className="font-medium">{row.number}</TableCell>
                {showDue ? (
                  <TableCell>
                    <span title={formatActivityExact(due)}>{formatDueWhen(due)}</span>
                  </TableCell>
                ) : null}
                <TableCell>{status(row)}</TableCell>
                {showOutstanding ? (
                  <TableCell className="text-right">{money(outstanding, row.currency)}</TableCell>
                ) : null}
                <TableCell className="text-right">{money(row.total, row.currency)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PagedFrame>
  );
}

export function CustomerInvoicesPanel({ activity }: { activity: CustomerActivity }) {
  if (activity.loading) return <p className="text-sm text-muted-foreground">Loading invoices…</p>;

  const open = activity.openInvoices;
  const openIds = new Set((open ?? []).map((row) => row.id));
  const notPosted = activity.invoices.filter((row) => NOT_ISSUED.has(row.status));
  const cleared =
    open == null
      ? []
      : activity.invoices.filter(
          (row) => !SKIPPED.has(row.status) && !NOT_ISSUED.has(row.status) && !openIds.has(row.id)
        );
  const issuedWithoutPayment =
    open == null
      ? activity.invoices.filter((row) => !NOT_ISSUED.has(row.status) && !SKIPPED.has(row.status))
      : [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Not paid</h2>
        {open == null ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Payment status needs finance access. These are the invoices on file.
            </p>
            <InvoiceRows
              rows={issuedWithoutPayment}
              empty="No issued invoices."
              entityLabel="invoices"
              status={(row) => <StatusBadge status={row.status} />}
            />
          </div>
        ) : (
          <InvoiceRows
            rows={open}
            empty="No open invoices. Nothing is waiting to be paid."
            entityLabel="open invoices"
            status={(row) => {
              const partial = "allocated" in row && row.allocated > 0 && "outstanding" in row && row.outstanding > 0;
              return partial ? <Badge variant="secondary">Part paid</Badge> : <Badge variant="outline">Not paid</Badge>;
            }}
          />
        )}
      </section>

      {open == null ? null : (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Cleared</h2>
          <InvoiceRows
            rows={cleared}
            empty="No invoices have been cleared yet."
            entityLabel="cleared invoices"
            status={() => <Badge variant="secondary">Cleared</Badge>}
          />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Not yet posted</h2>
        <InvoiceRows
          rows={notPosted}
          empty="No draft or unposted invoices."
          entityLabel="draft invoices"
          status={(row) => <StatusBadge status={row.status} />}
        />
      </section>
    </div>
  );
}

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  MPESA: "M-Pesa",
};

export function CustomerPaymentsPanel({ activity }: { activity: CustomerActivity }) {
  const pager = useClientPage(activity.payments ?? []);
  if (activity.loading) return <p className="text-sm text-muted-foreground">Loading payments…</p>;
  if (activity.payments == null) {
    return <p className="text-sm text-muted-foreground">Payment history needs finance access.</p>;
  }
  if (activity.payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded for this customer yet.</p>;
  }
  return (
    <PagedFrame pager={pager} entityLabel="payments">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Cleared invoices</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pager.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <When value={row.date} />
              </TableCell>
              <TableCell className="font-medium">{row.number}</TableCell>
              <TableCell>{row.paymentMethod ? METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod : "—"}</TableCell>
              <TableCell>
                {row.allocations?.length ? (
                  <span className="flex flex-wrap gap-x-2 gap-y-1">
                    {row.allocations.map((allocation) => (
                      <Link
                        key={`${allocation.documentId}-${allocation.amount}`}
                        href={`/docs/${allocation.documentType || "invoice"}/${allocation.documentId}`}
                        className="hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {allocation.documentNumber || "Invoice"}
                      </Link>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not allocated</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-right">{money(row.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PagedFrame>
  );
}

export function CustomerCreditNotes({ activity }: { activity: CustomerActivity }) {
  if (activity.loading) return <p className="text-sm text-muted-foreground">Loading credit notes…</p>;
  return (
    <ActivityTable
      rows={activity.creditNotes}
      empty="No credit notes for this customer."
      docType="credit-note"
      entityLabel="credit notes"
    />
  );
}
