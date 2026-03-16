"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchBillingInvoicesApi,
  fetchBillingPricingApi,
  fetchBillingUsageApi,
  type BillingInvoiceRow,
  type BillingPricing,
  type BillingUsagePreview,
} from "@/lib/api/billing";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function SettingsBillingPage() {
  const [usage, setUsage] = React.useState<BillingUsagePreview | null>(null);
  const [pricing, setPricing] = React.useState<BillingPricing | null>(null);
  const [invoices, setInvoices] = React.useState<BillingInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usagePayload, pricingPayload, invoicePayload] = await Promise.all([
        fetchBillingUsageApi(),
        fetchBillingPricingApi(),
        fetchBillingInvoicesApi(),
      ]);
      setUsage(usagePayload);
      setPricing(pricingPayload);
      setInvoices(invoicePayload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell>
      <PageHeader
        title="Billing"
        description="Seat usage, franchise allocations, pending prorations, and internal invoices."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Billing" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <Icons.RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Franchise units</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{usage?.franchiseCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Included seats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{usage?.includedSeatCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{usage?.activeUserCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Billable extra seats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{usage?.billableAdditionalUserCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending prorations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCents(usage?.pendingProrationCents ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Current month projection</CardTitle>
              <CardDescription>
                {usage ? `${usage.periodStart} to ${usage.periodEnd}` : "Monthly billing preview"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Projected total</p>
                <p className="text-3xl font-semibold">{formatCents(usage?.projectedTotalCents ?? 0)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Pricing model</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Standard user: ${pricing?.standardPerUserPerMonth ?? 0}/month</li>
                  <li>Franchise: ${pricing?.franchiseBasePerMonth ?? 0}/month with {pricing?.franchiseIncludedLicenses ?? 0} included users</li>
                  <li>Additional franchise user: ${pricing?.franchiseAdditionalUserPerMonth ?? 0}/month</li>
                  <li>Copilot: ${pricing?.copilotPerUserPerMonth ?? 0}/user/month</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing breakdown</CardTitle>
              <CardDescription>Monthly lines driving the projected total.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !usage ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">Loading billing breakdown...</TableCell>
                    </TableRow>
                  ) : usage?.lineBreakdown.length ? (
                    usage.lineBreakdown.map((line, index) => (
                      <TableRow key={`${line.description}-${index}`}>
                        <TableCell>{line.description}</TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{formatCents(line.unitPriceCents)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCents(line.amountCents)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">No current billing lines.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent internal invoices</CardTitle>
            <CardDescription>Prorations and month-end invoices generated for this organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No internal invoices yet.</p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{invoice.status} · {invoice.id.slice(0, 8)}…</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.periodStart} to {invoice.periodEnd} · Due {invoice.dueDate}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">{formatCents(invoice.totalCents)}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {invoice.lineItems.map((line, index) => (
                      <div key={`${invoice.id}-${index}`} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {line.description}
                          {line.prorated ? " · prorated" : ""}
                        </span>
                        <span>{formatCents(line.amountCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
