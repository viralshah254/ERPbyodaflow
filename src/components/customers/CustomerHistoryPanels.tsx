"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { fetchArPaymentsPageApi, fetchArOpenPageApi } from "@/lib/api/payments";
import { formatMoney } from "@/lib/money";
import { formatActivityExact, formatActivityWhen } from "@/lib/format/nairobi-datetime";

type Kind = "sales-order" | "delivery-note" | "invoice" | "credit-note" | "open-invoices" | "payments";
type Row = { id: string; number: string; date: string; status: string; amount?: number; currency?: string; outstanding?: number; allocated?: number; href?: string; references?: Array<{ id: string; href: string; label: string }>; method?: string };
type Result = { rows: Row[]; hasMore: boolean; nextCursor: string | null; total?: number };
const METHODS: Record<string, string> = { BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", CASH: "Cash", MPESA: "M-Pesa" };

/** Bounded, server-paged history. Mounted only for the selected customer tab. */
export function CustomerActivityTable({ partyId, kind, label }: { partyId: string; kind: Kind; label: string }) {
  const [limit, setLimit] = React.useState(25);
  const [cursors, setCursors] = React.useState([""]);
  const [index, setIndex] = React.useState(0);
  const [retry, setRetry] = React.useState(0);
  const [result, setResult] = React.useState<{ key: string; page?: Result; error?: string } | null>(null);
  const key = `${partyId}:${kind}:${limit}:${cursors[index]}:${retry}`;
  const cursor = cursors[index];
  React.useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<Result> => {
      if (kind === "payments") {
        const page = await fetchArPaymentsPageApi({ partyId, limit, cursor });
        return { ...page, rows: page.items.map((r) => ({ id: r.id, number: r.number, date: r.date, status: r.status, amount: r.amount, currency: r.currency, method: r.paymentMethod ? METHODS[r.paymentMethod] || r.paymentMethod : "—", references: r.allocations?.map((a, i) => ({ id: `${a.documentId}-${i}`, href: `/docs/${a.documentType || "invoice"}/${encodeURIComponent(a.documentId)}`, label: a.documentNumber || "Invoice" })) })) };
      }
      if (kind === "open-invoices") {
        const offset = Number(cursor) || 0;
        const page = await fetchArOpenPageApi(partyId, { limit, offset });
        return { total: page.openCount, hasMore: page.hasMore, nextCursor: page.hasMore ? String(offset + page.items.length) : null, rows: page.items.map((r) => ({ ...r, amount: r.total, href: `/docs/invoice/${encodeURIComponent(r.id)}` })) };
      }
      const page = await fetchDocumentListPageApi(kind, { partyId, limit, cursor });
      return { total: page.total, hasMore: page.hasMore, nextCursor: page.nextCursor, rows: page.items.map((r) => ({ ...r, amount: r.total, date: r.createdAt || r.date, href: `/docs/${kind}/${encodeURIComponent(r.id)}` })) };
    };
    void load().then((page) => { if (!cancelled) setResult({ key, page }); }).catch((error) => { if (!cancelled) setResult({ key, error: error instanceof Error ? error.message : `Could not load ${label}.` }); });
    return () => { cancelled = true; };
  }, [partyId, kind, limit, cursor, key, label]);
  const current = result?.key === key ? result : null;
  const loading = !current;
  const page = current?.page;
  const error = current?.error;
  return <section className="space-y-3" aria-label={label}>
    <h2 className="text-base font-semibold">{label}</h2>
    {error ? <div role="alert" className="space-y-2"><p>{error}</p><Button variant="outline" onClick={() => setRetry((n) => n + 1)}>Retry {label.toLowerCase()}</Button></div> : <>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Loading {label.toLowerCase()}…</p> : !page?.rows.length ? <p className="text-sm text-muted-foreground">No {label.toLowerCase()} found.</p> : <Table>
        <TableHeader><TableRow><TableHead>When</TableHead><TableHead>{kind === "payments" ? "Receipt" : "Document"}</TableHead><TableHead>Status</TableHead>{kind === "payments" ? <><TableHead>Method</TableHead><TableHead>Applied to</TableHead></> : null}{kind === "open-invoices" ? <TableHead className="text-right">Outstanding</TableHead> : null}<TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
        <TableBody>{page.rows.map((row) => <TableRow key={row.id}>
          <TableCell><span title={formatActivityExact(row.date) || undefined}>{formatActivityWhen(row.date)}</span></TableCell>
          <TableCell>{row.href ? <Link href={row.href} className="font-medium hover:underline">{row.number}</Link> : row.number}</TableCell>
          <TableCell>{kind === "open-invoices" ? <Badge variant="outline">{(row.allocated ?? 0) > 0 ? "Part paid" : "Not paid"}</Badge> : <StatusBadge status={row.status} />}</TableCell>
          {kind === "payments" ? <><TableCell>{row.method}</TableCell><TableCell>{row.references?.length ? <span className="flex flex-wrap gap-2">{row.references.map((ref) => <Link key={ref.id} href={ref.href} className="hover:underline">{ref.label}</Link>)}</span> : "Not allocated"}</TableCell></> : null}
          {kind === "open-invoices" ? <TableCell className="text-right">{formatMoney(row.outstanding ?? 0, row.currency || "KES")}</TableCell> : null}
          <TableCell className="text-right">{row.amount == null ? "—" : formatMoney(row.amount, row.currency || "KES")}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
      <TablePagination pageOffset={index * limit} pageSize={limit} itemCount={page?.rows.length || 0} hasMore={Boolean(page?.hasMore && page.nextCursor)} totalCount={page?.total} loading={loading} entityLabel={label.toLowerCase()} pageSizeOptions={[10, 25, 50]} onPageSizeChange={(n) => { setLimit(n); setIndex(0); setCursors([""]); }} onPrevious={() => setIndex((n) => Math.max(0, n - 1))} onNext={() => { if (!page?.nextCursor) return; setCursors((old) => [...old.slice(0, index + 1), page.nextCursor!]); setIndex((n) => n + 1); }} />
    </>}
  </section>;
}

export function CustomerOrdersPanel({ partyId }: { partyId: string }) {
  return <div className="space-y-8"><CustomerActivityTable key={`${partyId}:orders`} partyId={partyId} kind="sales-order" label="Orders" /><CustomerActivityTable key={`${partyId}:deliveries`} partyId={partyId} kind="delivery-note" label="Deliveries" /></div>;
}
export function CustomerInvoicesPanel({ partyId, canReadAr }: { partyId: string; canReadAr: boolean }) {
  return <div className="space-y-8">{canReadAr ? <CustomerActivityTable key={`${partyId}:open`} partyId={partyId} kind="open-invoices" label="Open invoices" /> : null}<p className="text-sm text-muted-foreground">Document status shows whether an invoice is posted. Open invoices show the remaining balance; use the Ledger tab for settlements and credits.</p><CustomerActivityTable key={`${partyId}:invoices`} partyId={partyId} kind="invoice" label="Invoices on file" /></div>;
}
export function CustomerPaymentsPanel({ partyId }: { partyId: string }) { return <CustomerActivityTable key={partyId} partyId={partyId} kind="payments" label="Receipts" />; }
export function CustomerCreditNotes({ partyId }: { partyId: string }) { return <CustomerActivityTable key={partyId} partyId={partyId} kind="credit-note" label="Credit notes" />; }
