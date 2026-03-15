"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchApPaymentsApi, fetchArPaymentsApi } from "@/lib/api/payments";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PaymentsPage() {
  const [receipts, setReceipts] = React.useState<Awaited<ReturnType<typeof fetchArPaymentsApi>>>([]);
  const [payments, setPayments] = React.useState<Awaited<ReturnType<typeof fetchApPaymentsApi>>>([]);

  React.useEffect(() => {
    Promise.all([fetchArPaymentsApi(), fetchApPaymentsApi()])
      .then(([arPayments, apPayments]) => {
        setReceipts(arPayments);
        setPayments(apPayments);
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load payments."));
  }, []);

  return (
    <PageLayout
      title="Payments & Receipts"
      description="Record and track all payments and receipts"
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href="/ar/payments">
            <Icons.ArrowDownCircle className="mr-2 h-4 w-4" />
            Record Receipt
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ap/payments">
            <Icons.ArrowUpCircle className="mr-2 h-4 w-4" />
            Make Payment
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.number}</TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.amount, "KES")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.number}</TableCell>
                    <TableCell>{item.party}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.amount, "KES")}</TableCell>
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





