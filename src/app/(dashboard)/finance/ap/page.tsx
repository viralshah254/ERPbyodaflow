"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchApPaymentsApi, fetchOpenBillsApi } from "@/lib/api/payments";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function AccountsPayablePage() {
  const baseCurrency = useBaseCurrency();
  const [bills, setBills] = React.useState<Awaited<ReturnType<typeof fetchOpenBillsApi>>>([]);
  const [payments, setPayments] = React.useState<Awaited<ReturnType<typeof fetchApPaymentsApi>>>([]);

  React.useEffect(() => {
    Promise.all([fetchOpenBillsApi(), fetchApPaymentsApi()])
      .then(([openBills, apPayments]) => {
        setBills(openBills);
        setPayments(apPayments);
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load payables."));
  }, []);

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
            <CardHeader><CardTitle className="text-sm">Open bills</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{bills.length}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatMoney(
                bills.reduce((sum, item) => {
                  const rate = item.currency && item.currency !== baseCurrency ? (item.exchangeRate ?? 1) : 1;
                  return sum + item.outstanding * rate;
                }, 0),
                baseCurrency
              )}
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
                      <Link href={`/docs/bill/${item.id}`} className="hover:underline font-medium">
                        {item.number}
                      </Link>
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
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





