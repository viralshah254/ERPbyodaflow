"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPlatformInvoicesApi,
  fetchPlatformBillingSummaryApi,
  type PlatformInvoiceRow,
  type PlatformBillingSummary,
} from "@/lib/api/platform";
import { FileText } from "lucide-react";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function PlatformBillingPage() {
  const searchParams = useSearchParams();
  const tenantIdFilter = searchParams.get("tenantId") || undefined;
  const [invoices, setInvoices] = React.useState<PlatformInvoiceRow[]>([]);
  const [summary, setSummary] = React.useState<PlatformBillingSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPlatformInvoicesApi(tenantIdFilter, statusFilter || undefined),
      fetchPlatformBillingSummaryApi(),
    ])
      .then(([invList, sum]) => {
        if (!cancelled) {
          setInvoices(invList);
          setSummary(sum);
        }
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, tenantIdFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Invoices and revenue.</p>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeSubscriptions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCents(summary.mrrCents)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue (paid)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCents(summary.revenueCents)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Paid invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.paidInvoicesCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {tenantIdFilter ? `Platform-issued invoices for tenant ${tenantIdFilter}` : "Platform-issued invoices"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Link href={`/platform/customers/${inv.tenantId}`} className="hover:underline">
                        {inv.tenantId.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {inv.periodStart} – {inv.periodEnd}
                    </TableCell>
                    <TableCell className="text-sm">{inv.dueDate}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                    <TableCell className="text-right font-medium">{formatCents(inv.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
