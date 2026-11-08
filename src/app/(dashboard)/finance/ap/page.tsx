"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchApOpenPageApi, fetchApPaymentsApi } from "@/lib/api/payments";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function AccountsPayablePage() {
  const baseCurrency = useBaseCurrency();
  const [bills, setBills] = React.useState<Awaited<ReturnType<typeof fetchApOpenPageApi>>["items"]>([]);
  const [outstandingTotal, setOutstandingTotal] = React.useState(0);
  const [currencyTotals, setCurrencyTotals] = React.useState<Array<{ currency: string; total: number; count: number }> | undefined>();
  const [openCount, setOpenCount] = React.useState(0);
  const [payments, setPayments] = React.useState<Awaited<ReturnType<typeof fetchApPaymentsApi>>>([]);

  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const pageSize = 50;

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([fetchApOpenPageApi(undefined, { offset, limit: pageSize }), fetchApPaymentsApi()])
      .then(([openBills, apPayments]) => {
        if (!active) return;
        setHasMore(openBills.hasMore);
        setBills(openBills.items);
        setOutstandingTotal(openBills.outstandingTotal);
        setCurrencyTotals(openBills.outstandingByCurrency);
        setOpenCount(openBills.openCount);
        setPayments(apPayments);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(true);
        toast.error((error as Error).message || "Failed to load balances.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset]);

  return (
    <PageLayout
      title="Accounts Payable"
      description="Manage supplier bills and payments"
      actions={
        <Button asChild>
          <Link href="/docs/bill/new">
          <Icons.Plus className="mr-2 h-4 w-4" />
          Record Bill
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Open payable items</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{openCount}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">
              {currencyTotals?.length ? currencyTotals.map((item) => <div key={item.currency}>{formatMoney(item.total, item.currency)}</div>) : formatMoney(outstandingTotal, baseCurrency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{payments.length}</CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "AP Bills", description: "View and manage supplier bills", href: "/ap/bills", icon: Icons.FileText },
            { label: "3-way Match", description: "Reconcile PO, GRN, and Bill", href: "/ap/three-way-match", icon: Icons.GitCompare },
            { label: "AP Payments", description: "Record and track payments", href: "/ap/payments", icon: Icons.CreditCard },
            { label: "Suppliers", description: "Manage supplier master data", href: "/ap/suppliers", icon: Icons.Users },
            { label: "Supplier statements", description: "Period statements with opening balance", href: "/ap/statements", icon: Icons.FileText },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
                <CardContent className="flex items-start gap-3 pt-4 pb-4">
                  <div className="rounded-md bg-muted p-2 group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Open supplier balances</CardTitle>
          </CardHeader>
          <CardContent>
            {loadError ? <p role="alert" className="p-4 text-destructive">Could not load this page. Previously loaded rows may be out of date.</p> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.id.startsWith("opening:") ? (
                        item.number
                      ) : (
                        <Link href={`/docs/bill/${item.id}`} className="hover:underline font-medium">
                          {item.number}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell>{item.dueDate ?? "—"}</TableCell>
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
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-3 border-t p-4">
              <span className="text-sm text-muted-foreground" aria-live="polite">{loading ? "Loading…" : `Page ${Math.floor(offset / pageSize) + 1} · bills shown: ${bills.length}`}</span>
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





