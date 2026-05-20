"use client";

import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
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
  cancelBillingCheckoutApi,
  confirmBillingCheckoutApi,
  fetchBillingCheckoutApi,
  fetchBillingInvoicesApi,
  fetchBillingPricingApi,
  fetchBillingPaymentMethodApi,
  createBillingSetupIntentApi,
  saveBillingPaymentMethodApi,
  removeBillingCheckoutItemApi,
  type BillingCheckout,
  type BillingInvoiceRow,
  type BillingPricing,
  type BillingPaymentMethod,
} from "@/lib/api/billing";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Stripe card setup form — only rendered inside <Elements> when Stripe is configured. */
function SaveCardForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true);
    try {
      const { data: setupData } = await createBillingSetupIntentApi().then((d) => ({ data: d }));
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");
      const { setupIntent, error } = await stripe.confirmCardSetup(setupData.clientSecret, {
        payment_method: { card: cardElement },
      });
      if (error) throw new Error(error.message ?? "Card setup failed");
      if (setupIntent?.payment_method) {
        await saveBillingPaymentMethodApi(setupIntent.payment_method as string);
        toast.success("Payment method saved. Charges will be applied automatically on checkout.");
        onSaved();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save card.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background px-3 py-2.5">
        <CardElement
          options={{
            style: {
              base: { fontSize: "14px", color: "hsl(var(--foreground))", "::placeholder": { color: "hsl(var(--muted-foreground))" } },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving || !stripe}>
        {saving ? "Saving…" : "Save card"}
      </Button>
    </div>
  );
}

export default function SettingsBillingPage() {
  const copilotEnabled = useCopilotFeatureEnabled();
  const [checkout, setCheckout] = React.useState<BillingCheckout | null>(null);
  const [pricing, setPricing] = React.useState<BillingPricing | null>(null);
  const [invoices, setInvoices] = React.useState<BillingInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [checkoutBusy, setCheckoutBusy] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<BillingPaymentMethod>(null);
  const [pmLoading, setPmLoading] = React.useState(false);
  const [showAddCard, setShowAddCard] = React.useState(false);

  const loadPaymentMethod = React.useCallback(async () => {
    setPmLoading(true);
    try {
      const pm = await fetchBillingPaymentMethodApi();
      setPaymentMethod(pm.configured ? pm.paymentMethod : null);
    } catch {
      // non-fatal
    } finally {
      setPmLoading(false);
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [checkoutPayload, pricingPayload, invoicePayload] = await Promise.all([
        fetchBillingCheckoutApi(),
        fetchBillingPricingApi(),
        fetchBillingInvoicesApi(),
      ]);
      setCheckout(checkoutPayload);
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
    void loadPaymentMethod();
  }, [load, loadPaymentMethod]);

  return (
    <PageShell>
      <PageHeader
        title="Billing"
        description="Seat usage, franchise allocations, pending prorations, and internal invoices."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
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
              <CardTitle className="text-sm">Franchise outlets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {checkout?.liveUsage.isFranchiseBilling
                  ? checkout.liveUsage.franchiseCount
                  : (checkout?.liveUsage.activeFranchiseOutletCount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {checkout?.liveUsage.isFranchiseBilling ? "franchise unit" : "active outlets"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Included seats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{checkout?.liveUsage.includedSeatCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{checkout?.liveUsage.activeUserCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">in this org</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Billable extra seats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{checkout?.liveUsage.billableAdditionalUserCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending prorations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCents(checkout?.liveUsage.pendingProrationCents ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Current month projection</CardTitle>
              <CardDescription>
                {checkout ? `${checkout.liveUsage.periodStart} to ${checkout.liveUsage.periodEnd}` : "Monthly billing preview"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Projected total</p>
                <p className="text-3xl font-semibold">{formatCents(checkout?.liveUsage.projectedTotalCents ?? 0)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Pricing model</p>
                {checkout?.liveUsage.customFlatRatePerUserPerMonth !== undefined ? (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 space-y-1">
                    <p className="text-sm font-medium text-blue-400">Custom contracted rate</p>
                    <p className="text-sm text-muted-foreground">
                      ${checkout.liveUsage.customFlatRatePerUserPerMonth}/user/month — flat rate (all users billed equally)
                    </p>
                    {copilotEnabled ? (
                      <p className="text-sm text-muted-foreground">
                        Copilot: ${pricing?.copilotPerUserPerMonth ?? 0}/user/month (additional)
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Standard user: ${pricing?.standardPerUserPerMonth ?? 0}/month</li>
                    <li>Franchise: ${pricing?.franchiseBasePerMonth ?? 0}/month with {pricing?.franchiseIncludedLicenses ?? 0} included users</li>
                    <li>Additional franchise user: ${pricing?.franchiseAdditionalUserPerMonth ?? 0}/month</li>
                    {copilotEnabled ? (
                      <li>Copilot: ${pricing?.copilotPerUserPerMonth ?? 0}/user/month</li>
                    ) : null}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing breakdown</CardTitle>
              <CardDescription>Live monthly lines driving the projected total.</CardDescription>
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
                  {loading && !checkout ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">Loading billing breakdown...</TableCell>
                    </TableRow>
                  ) : checkout?.liveUsage.lineBreakdown.length ? (
                    checkout.liveUsage.lineBreakdown.map((line, index) => (
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
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Pending checkout</CardTitle>
              <CardDescription>
                Stage multiple users and franchise outlets, then confirm one consolidated prorated invoice.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Checkout now</p>
              <p className="text-2xl font-semibold">{formatCents(checkout?.quoteTotalCents ?? 0)}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!checkout || checkout.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staged users or franchise outlets yet. Add them from the user or franchise screens, then return here to check out.</p>
            ) : (
              <>
                <div className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{checkout.items.length} staged item(s)</p>
                      <p className="text-sm text-muted-foreground">
                        {checkout.stagedUserCount ?? 0} user(s) and {checkout.stagedFranchiseCount ?? 0} franchise outlet(s) pending activation
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Projected monthly after checkout</p>
                      <p className="text-lg font-semibold">{formatCents(checkout.projectedMonthlyCents)}</p>
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
                    {checkout.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemType === "USER" ? "User" : "Franchise outlet"}</TableCell>
                        <TableCell>{item.label}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={checkoutBusy}
                            onClick={async () => {
                              try {
                                setCheckoutBusy(true);
                                setCheckout(await removeBillingCheckoutItemApi(item.id));
                                toast.success("Removed from checkout.");
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
                    {checkout.quoteLineItems.map((line, index) => (
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
                        setCheckout(await cancelBillingCheckoutApi());
                        toast.success("Checkout basket canceled.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to cancel checkout.");
                      } finally {
                        setCheckoutBusy(false);
                      }
                    }}
                  >
                    Cancel basket
                  </Button>
                  <Button
                    disabled={checkoutBusy || checkout.items.length === 0}
                    onClick={async () => {
                      try {
                        setCheckoutBusy(true);
                        const result = await confirmBillingCheckoutApi();
                        if (result.stripe.charged) {
                          toast.success(`Payment confirmed. Invoice ${result.invoiceId.slice(0, 8)}… paid via card.`);
                        } else if (result.stripe.reason === "no_payment_method_on_file") {
                          toast.success(`Checkout complete. Invoice ${result.invoiceId.slice(0, 8)}… created — add a card below to enable auto-payment.`);
                        } else if (result.stripe.reason === "stripe_not_configured") {
                          toast.success(`Checkout complete. Invoice ${result.invoiceId.slice(0, 8)}… created (Stripe not yet configured).`);
                        } else {
                          toast.success(`Checkout complete. Invoice ${result.invoiceId.slice(0, 8)}… created.`);
                          if (result.stripe.reason?.startsWith("requires_action")) {
                            toast.warning("Payment requires additional authentication — check your card provider.");
                          }
                        }
                        await load();
                        await loadPaymentMethod();
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to confirm checkout.");
                      } finally {
                        setCheckoutBusy(false);
                      }
                    }}
                  >
                    {checkoutBusy ? "Processing…" : paymentMethod ? "Confirm & pay now" : "Confirm checkout"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>
              Card on file for automatic charges when confirming checkout.
              {!stripePublishableKey && " Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card collection."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pmLoading ? (
              <p className="text-sm text-muted-foreground">Loading payment method…</p>
            ) : paymentMethod ? (
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Icons.CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium capitalize">{paymentMethod.brand} •••• {paymentMethod.last4}</p>
                    <p className="text-sm text-muted-foreground">Expires {paymentMethod.expMonth}/{paymentMethod.expYear}</p>
                  </div>
                </div>
                {stripePublishableKey && (
                  <Button variant="outline" size="sm" onClick={() => setShowAddCard(!showAddCard)}>
                    {showAddCard ? "Cancel" : "Replace card"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-4 py-6 text-center">
                <Icons.CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No payment method on file — checkout invoices remain OPEN until paid manually.</p>
                {stripePublishableKey && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddCard(true)}>Add card</Button>
                )}
              </div>
            )}
            {showAddCard && stripePublishableKey && stripePromise && (
              <Elements stripe={stripePromise}>
                <SaveCardForm onSaved={() => { setShowAddCard(false); void loadPaymentMethod(); }} />
              </Elements>
            )}
          </CardContent>
        </Card>

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
                        {(invoice.billingKind ?? "MONTH_END").replaceAll("_", " ")} · {invoice.periodStart} to {invoice.periodEnd} · Due {invoice.dueDate}
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
