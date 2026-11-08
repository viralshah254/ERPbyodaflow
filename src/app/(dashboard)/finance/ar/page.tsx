"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchArOpenPageApi, fetchArPaymentsApi } from "@/lib/api/payments";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { CustomerLink } from "@/components/customers/CustomerLink";
import { cn } from "@/lib/utils";

function duePresentation(value?: string): { date: string; hint: string; overdue: boolean } {
  if (!value) return { date: "—", hint: "", overdue: false };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", hint: "", overdue: false };
  const formatted = date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  const start = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const days = Math.round((start(date) - start(new Date())) / 86_400_000);
  if (days < 0) {
    const late = Math.abs(days);
    return { date: formatted, hint: late === 1 ? "1 day overdue" : `${late} days overdue`, overdue: true };
  }
  if (days === 0) return { date: formatted, hint: "Due today", overdue: false };
  if (days === 1) return { date: formatted, hint: "Due tomorrow", overdue: false };
  if (days <= 7) return { date: formatted, hint: `Due in ${days} days`, overdue: false };
  return { date: formatted, hint: "", overdue: false };
}

export default function AccountsReceivablePage() {
  const baseCurrency = useBaseCurrency();
  const [invoices, setInvoices] = React.useState<Awaited<ReturnType<typeof fetchArOpenPageApi>>["items"]>([]);
  const [outstandingTotal, setOutstandingTotal] = React.useState(0);
  const [currencyTotals, setCurrencyTotals] = React.useState<Array<{ currency: string; total: number; count: number }> | undefined>();
  const [openCount, setOpenCount] = React.useState(0);
  const [payments, setPayments] = React.useState<Awaited<ReturnType<typeof fetchArPaymentsApi>>>([]);

  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const pageSize = 50;

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([fetchArOpenPageApi(undefined, { offset, limit: pageSize }), fetchArPaymentsApi()])
      .then(([openInvoices, arPayments]) => {
        if (!active) return;
        setHasMore(openInvoices.hasMore);
        setInvoices(openInvoices.items);
        setOutstandingTotal(openInvoices.outstandingTotal);
        setCurrencyTotals(openInvoices.outstandingByCurrency);
        setOpenCount(openInvoices.openCount);
        setPayments(arPayments);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(true);
        toast.error((error as Error).message || "Failed to load balances.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset]);

  const overdue = invoices.filter((item) => duePresentation(item.dueDate).overdue);
  const overdueTotals = overdue.reduce<Record<string, number>>((totals, item) => {
    const currency = item.currency ?? baseCurrency;
    totals[currency] = (totals[currency] ?? 0) + item.outstanding;
    return totals;
  }, {});
  const mpesaReceipts = payments.filter((item) => item.paymentMethod === "MPESA").length;

  return (
    <PageLayout
      title="Accounts Receivable"
      description="What customers still owe, and the receipts already taken."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/ar/statements">
              <Icons.FileText className="mr-2 h-4 w-4" />
              Customer statements
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ar/aging">
              <Icons.BarChart3 className="mr-2 h-4 w-4" />
              Aging report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ar/receipts">
              <Icons.Receipt className="mr-2 h-4 w-4" />
              Collect receipts
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open receivable items</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{openCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {currencyTotals?.length ? currencyTotals.map((item) => <div key={item.currency}>{formatMoney(item.total, item.currency)}</div>) : formatMoney(outstandingTotal, baseCurrency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue on this page</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold tabular-nums", overdue.length > 0 && "text-amber-600 dark:text-amber-300")}>
                {overdue.length}
              </p>
              {overdue.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">{Object.entries(overdueTotals).map(([currency, total]) => formatMoney(total, currency)).join(" · ")} still unpaid</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No overdue items on this page</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{payments.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {mpesaReceipts} by M-Pesa ·{" "}
                <Link href="/ar/payments" className="underline-offset-2 hover:underline">
                  Record a receipt
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Open receivables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadError ? <p role="alert" className="p-4 text-destructive">Could not load this page. Previously loaded rows may be out of date.</p> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((item) => {
                  const due = duePresentation(item.dueDate);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link href={`/docs/invoice/${item.id}`} className="font-medium underline-offset-2 hover:underline">
                          {item.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <CustomerLink id={item.customerId} name={item.customerName} />
                      </TableCell>
                      <TableCell>
                        <div className={cn(due.overdue && "font-medium text-amber-700 dark:text-amber-300")}>{due.date}</div>
                        {due.hint ? (
                          <div className={cn("text-xs", due.overdue ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                            {due.hint}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <DualCurrencyAmount
                          amount={item.outstanding}
                          currency={item.currency ?? baseCurrency}
                          exchangeRate={item.exchangeRate}
                          baseCurrency={baseCurrency}
                          align="right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No open invoices. Posted customer invoices that still have a balance show up here.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-3 border-t p-4">
              <span className="text-sm text-muted-foreground" aria-live="polite">{loading ? "Loading…" : `Page ${Math.floor(offset / pageSize) + 1} · invoices shown: ${invoices.length}`}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</Button>
                <Button variant="outline" disabled={loading || loadError || !hasMore} onClick={() => setOffset(offset + pageSize)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





