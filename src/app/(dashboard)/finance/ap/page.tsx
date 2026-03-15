"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchApPaymentsApi, fetchOpenBillsApi } from "@/lib/api/payments";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function AccountsPayablePage() {
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
              {formatMoney(bills.reduce((sum, item) => sum + item.outstanding, 0), "KES")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{payments.length}</CardContent>
          </Card>
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
                    <TableCell>{item.number}</TableCell>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell>{item.dueDate ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.outstanding, item.currency ?? "KES")}</TableCell>
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





