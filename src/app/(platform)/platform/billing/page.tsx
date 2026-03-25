"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  fetchPlatformBillingCheckoutsApi,
  fetchPlatformInvoicesApi,
  fetchPlatformBillingSummaryApi,
  fetchPlatformProvisioningCheckoutApi,
  cancelPlatformProvisioningCheckoutApi,
  confirmPlatformProvisioningCheckoutApi,
  removePlatformProvisioningCheckoutItemApi,
  confirmPlatformBillingCheckoutApi,
  updatePlatformInvoiceApi,
  type PlatformBillingCheckoutRow,
  type PlatformInvoiceRow,
  type PlatformBillingSummary,
  type PlatformProvisioningCheckout,
  type PlatformProvisioningCheckoutReceipt,
} from "@/lib/api/platform";
import { Copy } from "lucide-react";
import { toast } from "sonner";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function copyAdminCredentials(customer: {
  adminEmail: string;
  initialPassword: string;
  tenantId: string;
  orgId: string;
  branchId: string;
  roleId: string;
  userId: string;
  mustChangePassword: boolean;
}) {
  const lines = [
    "Admin sign-in (share securely)",
    "────────────────────────────",
    `Email: ${customer.adminEmail}`,
    `Temporary password: ${customer.initialPassword}`,
    "",
    "IDs (for support/admin):",
    `Tenant ID: ${customer.tenantId}`,
    `Org ID: ${customer.orgId}`,
    `Branch ID: ${customer.branchId}`,
    `Role ID: ${customer.roleId}`,
    `User ID: ${customer.userId}`,
    "",
    customer.mustChangePassword ? "Password reset required on first login." : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export default function PlatformBillingPage() {
  const searchParams = useSearchParams();
  const tenantIdFilter = searchParams.get("tenantId") || undefined;
  const orgIdFilter = searchParams.get("orgId") || undefined;
  const [invoices, setInvoices] = React.useState<PlatformInvoiceRow[]>([]);
  const [checkouts, setCheckouts] = React.useState<PlatformBillingCheckoutRow[]>([]);
  const [provisioningCheckout, setProvisioningCheckout] = React.useState<PlatformProvisioningCheckout | null>(null);
  const [lastProvisioningReceipt, setLastProvisioningReceipt] = React.useState<PlatformProvisioningCheckoutReceipt | null>(null);
  const [summary, setSummary] = React.useState<PlatformBillingSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [checkoutBusy, setCheckoutBusy] = React.useState(false);
  const [tenantCheckoutConfirmingId, setTenantCheckoutConfirmingId] = React.useState<string | null>(null);
  const [invoiceBusyId, setInvoiceBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    Promise.all([
      fetchPlatformBillingCheckoutsApi(tenantIdFilter, orgIdFilter),
      fetchPlatformInvoicesApi(tenantIdFilter, statusFilter || undefined, orgIdFilter),
      fetchPlatformBillingSummaryApi(),
      fetchPlatformProvisioningCheckoutApi(),
    ])
      .then(([checkoutList, invList, sum, stagingCheckout]) => {
        setCheckouts(checkoutList);
        setInvoices(invList);
        setSummary(sum);
        setProvisioningCheckout(stagingCheckout);
      })
      .catch(() => {
        setInvoices([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [statusFilter, tenantIdFilter, orgIdFilter]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Invoices and revenue.</p>
        {(tenantIdFilter || orgIdFilter) && (
          <p className="text-sm text-muted-foreground mt-1">
            Filtered
            {tenantIdFilter ? (
              <>
                {" "}
                · tenant <span className="font-mono">{tenantIdFilter.slice(0, 8)}…</span>
              </>
            ) : null}
            {orgIdFilter ? (
              <>
                {" "}
                · org <span className="font-mono">{orgIdFilter}</span>
              </>
            ) : null}
            .{" "}
            <Link href="/platform/billing" className="underline">
              Clear filters
            </Link>
          </p>
        )}
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

      {lastProvisioningReceipt ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Latest activation receipt</CardTitle>
              <CardDescription>
                Newly activated customer records and temporary credentials from the last confirmed platform checkout.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastProvisioningReceipt(null)}
              aria-label="Dismiss receipt"
            >
              Dismiss
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Checkout {lastProvisioningReceipt.checkoutId.slice(0, 8)}...</p>
                  <p className="text-sm text-muted-foreground">
                    {lastProvisioningReceipt.createdCustomers.length} customer provision(s) and {lastProvisioningReceipt.createdOrgs.length} org create(s) activated
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Prorated total</p>
                  <p className="text-lg font-semibold">{formatCents(lastProvisioningReceipt.quoteTotalCents)}</p>
                </div>
              </div>
            </div>

            {lastProvisioningReceipt.createdCustomers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Provisioned customers</p>
                <div className="space-y-3">
                  {lastProvisioningReceipt.createdCustomers.map((customer) => (
                    <div key={customer.userId} className="rounded-lg border p-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="grid gap-2 md:grid-cols-2 flex-1 min-w-0">
                          <p>
                            Admin email: <span className="font-medium">{customer.adminEmail}</span>
                          </p>
                          <p>
                            Temporary password: <span className="font-mono">{customer.initialPassword}</span>
                          </p>
                          <p>
                            Tenant ID: <span className="font-mono">{customer.tenantId}</span>
                          </p>
                          <p>
                            Org ID: <span className="font-mono">{customer.orgId}</span>
                          </p>
                          <p>
                            Branch ID: <span className="font-mono">{customer.branchId}</span>
                          </p>
                          <p>
                            Role ID: <span className="font-mono">{customer.roleId}</span>
                          </p>
                          <p>
                            User ID: <span className="font-mono">{customer.userId}</span>
                          </p>
                          <p>{customer.mustChangePassword ? "Password reset required on first login" : "Password reset not enforced"}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(copyAdminCredentials(customer));
                              toast.success("Credentials copied to clipboard. Share securely.");
                            } catch {
                              toast.error("Could not copy to clipboard.");
                            }
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy credentials
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {lastProvisioningReceipt.createdOrgs.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Provisioned organizations</p>
                <div className="space-y-3">
                  {lastProvisioningReceipt.createdOrgs.map((org) => (
                    <div key={org.id} className="rounded-lg border p-4 text-sm">
                      <p>
                        Name: <span className="font-medium">{org.name}</span>
                      </p>
                      <p>
                        Tenant ID: <span className="font-mono">{org.tenantId}</span>
                      </p>
                      <p>
                        Org ID: <span className="font-mono">{org.id}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {lastProvisioningReceipt.finalizedInvoices.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Created invoices</p>
                <div className="space-y-2">
                  {lastProvisioningReceipt.finalizedInvoices.map((invoice) => (
                    <div key={invoice.invoiceId} className="flex flex-wrap items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        Invoice <span className="font-mono">{invoice.invoiceId}</span> for tenant <span className="font-mono">{invoice.tenantId}</span>
                      </span>
                      <span>{formatCents(invoice.totalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Platform provisioning checkout</CardTitle>
            <CardDescription>Stage full customer onboarding and new org creations, then confirm one batched activation.</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Checkout total</p>
            <p className="text-2xl font-semibold">{formatCents(provisioningCheckout?.quoteTotalCents ?? 0)}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && !provisioningCheckout ? (
            <p className="text-sm text-muted-foreground">Loading platform provisioning checkout...</p>
          ) : !provisioningCheckout || provisioningCheckout.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staged platform provisioning items yet.</p>
          ) : (
            <>
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{provisioningCheckout.items.length} staged item(s)</p>
                    <p className="text-sm text-muted-foreground">
                      {provisioningCheckout.stagedCustomerCount} customer provision(s) and {provisioningCheckout.stagedOrgCount} org create(s)
                    </p>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provisioningCheckout.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.itemType === "CUSTOMER_PROVISION" ? "Customer" : "Organization"}</TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={checkoutBusy}
                          onClick={async () => {
                            try {
                              setCheckoutBusy(true);
                              setProvisioningCheckout(await removePlatformProvisioningCheckoutItemApi(item.id));
                              toast.success("Removed staged platform item.");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Failed to remove staged item.");
                            } finally {
                              setCheckoutBusy(false);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-2">
                <p className="text-sm font-medium">Prorated checkout quote</p>
                <div className="space-y-2">
                  {provisioningCheckout.quoteLineItems.map((line, index) => (
                    <div key={`${line.description}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        {line.description}
                        {line.prorated ? " · prorated" : ""}
                      </span>
                      <span>{formatCents(line.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={checkoutBusy}
                  onClick={async () => {
                    try {
                      setCheckoutBusy(true);
                      setProvisioningCheckout(await cancelPlatformProvisioningCheckoutApi());
                      toast.success("Platform provisioning basket canceled.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to cancel platform basket.");
                    } finally {
                      setCheckoutBusy(false);
                    }
                  }}
                >
                  Cancel basket
                </Button>
                <Button
                  disabled={checkoutBusy || provisioningCheckout.items.length === 0}
                  onClick={async () => {
                    try {
                      setCheckoutBusy(true);
                      const result = await confirmPlatformProvisioningCheckoutApi();
                      setLastProvisioningReceipt(result);
                      toast.success(`Platform checkout complete. ${result.finalizedInvoices.length} invoice(s) created.`);
                      await load();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to confirm platform checkout.");
                    } finally {
                      setCheckoutBusy(false);
                    }
                  }}
                >
                  {checkoutBusy ? "Processing..." : "Confirm platform checkout"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open checkouts</CardTitle>
          <CardDescription>
            Staged users or franchise outlets per organization. Tenant admins can confirm in{" "}
            <span className="font-medium text-foreground">Settings → Billing</span> (same org). Platform billing can
            confirm here after payment or agreement—this finalizes provisioning and creates the prorated invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : checkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open checkouts.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Projected monthly</TableHead>
                  <TableHead className="text-right">Checkout total</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.map((checkout) => (
                  <TableRow key={checkout.id}>
                    <TableCell>
                      <Link href={`/platform/customers/${checkout.tenantId}`} className="font-mono text-sm hover:underline">
                        {checkout.tenantId.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs" title={checkout.orgId}>
                      {checkout.orgId.slice(0, 8)}…
                    </TableCell>
                    <TableCell>{checkout.itemCount}</TableCell>
                    <TableCell>{formatCents(checkout.projectedMonthlyCents)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCents(checkout.quoteTotalCents)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={tenantCheckoutConfirmingId !== null || checkout.itemCount === 0}
                        onClick={async () => {
                          try {
                            setTenantCheckoutConfirmingId(checkout.id);
                            const result = await confirmPlatformBillingCheckoutApi(checkout.id);
                            toast.success(
                              `Checkout confirmed. Invoice ${result.invoiceId.slice(0, 8)}… · ${formatCents(result.quoteTotalCents)}`
                            );
                            await load();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed to confirm checkout.");
                          } finally {
                            setTenantCheckoutConfirmingId(null);
                          }
                        }}
                      >
                        {tenantCheckoutConfirmingId === checkout.id ? "Confirming…" : "Confirm checkout"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                  <TableHead>Breakdown</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="space-y-1">
                          {inv.lineItems.slice(0, 3).map((line, index) => (
                            <div key={`${inv.id}-${index}`}>
                              {line.description}: {formatCents(line.amountCents)}
                              {line.prorated ? " · prorated" : ""}
                            </div>
                          ))}
                          {inv.lineItems.length > 3 ? <div>+{inv.lineItems.length - 3} more lines</div> : null}
                        </div>
                      </TableCell>
                    <TableCell className="text-sm">{inv.dueDate}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(inv.billingKind ?? "MONTH_END").replaceAll("_", " ")}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCents(inv.totalCents)}</TableCell>
                    <TableCell className="text-right">
                      {inv.status === "OPEN" || inv.status === "DRAFT" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={invoiceBusyId !== null}
                          onClick={async () => {
                            try {
                              setInvoiceBusyId(inv.id);
                              await updatePlatformInvoiceApi(inv.id, { status: "PAID" });
                              toast.success("Invoice marked paid.");
                              await load();
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Could not update invoice.");
                            } finally {
                              setInvoiceBusyId(null);
                            }
                          }}
                        >
                          {invoiceBusyId === inv.id ? "…" : "Mark paid"}
                        </Button>
                      ) : null}
                    </TableCell>
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
