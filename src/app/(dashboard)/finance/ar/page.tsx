"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchArPaymentsApi, fetchOpenInvoicesApi } from "@/lib/api/payments";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function AccountsReceivablePage() {
  const baseCurrency = useBaseCurrency();
  const [invoices, setInvoices] = React.useState<Awaited<ReturnType<typeof fetchOpenInvoicesApi>>>([]);
  const [payments, setPayments] = React.useState<Awaited<ReturnType<typeof fetchArPaymentsApi>>>([]);

  React.useEffect(() => {
    Promise.all([fetchOpenInvoicesApi(), fetchArPaymentsApi()])
      .then(([openInvoices, arPayments]) => {
        setInvoices(openInvoices);
        setPayments(arPayments);
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load receivables."));
  }, []);

  return (
    <PageLayout
      title="Accounts Receivable"
      description="Manage customer invoices and payments"
      actions={
        <Button variant="outline" asChild>
          <Link href="/treasury/collections">
          <Icons.Download className="mr-2 h-4 w-4" />
          Aging Report
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Open invoices</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{invoices.length}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatMoney(
                invoices.reduce((sum, item) => {
                  const isBase = (item.currency ?? baseCurrency).toUpperCase() === baseCurrency.toUpperCase();
                  const kes = isBase ? item.outstanding : item.outstanding * (item.exchangeRate ?? 1);
                  return sum + kes;
                }, 0),
                baseCurrency
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Receipts</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{payments.length}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">M-Pesa receipts</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">
              {payments.filter((item) => item.paymentMethod === "MPESA").length}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Open receivables</CardTitle>
          </CardHeader>
          <CardContent>
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
                {invoices.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.number}</TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell>{item.dueDate}</TableCell>
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





