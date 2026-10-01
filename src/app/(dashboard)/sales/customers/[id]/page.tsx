"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerCreditTab } from "@/components/customers/CustomerCreditTab";
import { CustomerLedger } from "@/components/customers/CustomerLedger";
import { CustomerFormSheet } from "@/components/customers/CustomerFormSheet";
import {
  CustomerCreditNotes,
  CustomerInvoicesPanel,
  CustomerOrdersPanel,
  CustomerPaymentsPanel,
  useCustomerActivity,
} from "@/components/customers/CustomerHistoryPanels";
import { fetchPartyByIdApi, fetchPartyCreditSummaryApi, type PartyDetail } from "@/lib/api/parties";
import type { PartyCreditSummary } from "@/lib/api/parties";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { formatMoney } from "@/lib/money";
import { formatCustomerCreditLimit } from "@/lib/customers/format-credit-limit";
import { can } from "@/lib/rbac/can";
import { useCanWriteFinance, useCanWriteSales } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContext } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const TABS = ["overview", "orders", "invoices", "payments", "credit", "ledger"] as const;
type TabId = (typeof TABS)[number];

function isTab(value: string | null): value is TabId {
  return TABS.includes((value ?? "") as TabId);
}

export default function Customer360Page() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params.id ?? "");
  const user = useAuthStore((s) => s.user);
  const canReadAr = can(user, "finance.ar.read");
  const canWriteFinance = useCanWriteFinance();
  const canWriteSales = useCanWriteSales();
  const { templateId } = useOrgContext();
  const fmcg = isFmcgOrg(templateId);
  const { settings } = useFinancialSettings();
  const currency = settings.baseCurrency?.trim()?.toUpperCase() || "KES";
  const activity = useCustomerActivity(id, canReadAr);
  const [editOpen, setEditOpen] = React.useState(false);

  const requested = searchParams.get("tab");
  const initialTab: TabId =
    isTab(requested) && ((requested !== "ledger" && requested !== "payments") || canReadAr)
      ? requested
      : "overview";
  const [tab, setTab] = React.useState<TabId>(initialTab);
  const [party, setParty] = React.useState<PartyDetail | null>(null);
  const [credit, setCredit] = React.useState<PartyCreditSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, summary] = await Promise.all([
        fetchPartyByIdApi(id),
        canReadAr ? fetchPartyCreditSummaryApi(id) : Promise.resolve(null),
      ]);
      setParty(detail);
      setCredit(summary);
      if (!detail) toast.error("Customer not found.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to load customer");
      setParty(null);
    } finally {
      setLoading(false);
    }
  }, [canReadAr, id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onTabChange = (value: string) => {
    const next = isTab(value) ? value : "overview";
    if ((next === "ledger" || next === "payments") && !canReadAr) return;
    setTab(next);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", next);
    router.replace(`/sales/customers/${encodeURIComponent(id)}?${nextParams.toString()}`, { scroll: false });
  };

  const address = [
    party?.address?.line1,
    party?.address?.line2,
    party?.address?.city,
    party?.address?.region,
    party?.address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const openInvoiceCount = activity.openInvoices?.length ?? null;
  const clearedCount =
    activity.openInvoices == null
      ? null
      : activity.invoices.filter((row) => {
          if (["DRAFT", "PENDING_APPROVAL", "APPROVED", "CANCELLED", "REJECTED", "VOID"].includes(row.status)) {
            return false;
          }
          return !activity.openInvoices!.some((open) => open.id === row.id);
        }).length;

  return (
    <PageShell>
      <PageHeader
        title={party?.name ?? "Customer"}
        description={party?.code ? `Code ${party.code}` : "Orders, invoices, payments, and credit"}
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Customers", href: "/sales/customers" },
          { label: party?.name ?? "Customer" },
        ]}
        sticky
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/sales/customers">Back to list</Link>
            </Button>
            {canWriteSales ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Icons.Pencil className="mr-2 h-4 w-4" />
                Edit customer
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/docs/sales-order/new?party=${encodeURIComponent(id)}`}>
                <Icons.ShoppingCart className="mr-2 h-4 w-4" />
                New order
              </Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-4 px-6 pb-24 pt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading customer…</p>
        ) : !party ? (
          <p className="text-sm text-muted-foreground">Customer not found.</p>
        ) : (
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="mb-4 flex h-auto flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              {canReadAr ? <TabsTrigger value="payments">Payments</TabsTrigger> : null}
              <TabsTrigger value="credit">Credit</TabsTrigger>
              {canReadAr ? <TabsTrigger value="ledger">Ledger</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {canReadAr ? formatMoney(credit?.outstandingBalance ?? 0, currency) : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Credit limit</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatCustomerCreditLimit({
                      mode: credit?.creditControlMode ?? party.creditControlMode,
                      amount: credit?.creditLimitAmount ?? party.creditLimitAmount,
                      days: credit?.maxOutstandingInvoiceAgeDays ?? party.maxOutstandingInvoiceAgeDays,
                      currency,
                    })}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Not paid</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {openInvoiceCount == null ? "—" : openInvoiceCount}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Cleared invoices</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{clearedCount == null ? "—" : clearedCount}</CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>Contact and identity on file.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{party.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p>{party.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tax PIN</p>
                    <p>{party.taxId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p>{address || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Orders</p>
                    <p>{activity.loading ? "…" : activity.orders.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payments</p>
                    <p>{activity.payments == null ? "—" : activity.payments.length}</p>
                  </div>
                  {party.onHold ? (
                    <div>
                      <p className="text-muted-foreground">Account</p>
                      <Badge variant="destructive">On hold</Badge>
                    </div>
                  ) : null}
                  {credit?.utilizationPct != null ? (
                    <div>
                      <p className="text-muted-foreground">Credit used</p>
                      <p>{Math.round(credit.utilizationPct)}%</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <CustomerOrdersPanel activity={activity} />
            </TabsContent>

            <TabsContent value="invoices">
              <CustomerInvoicesPanel activity={activity} />
            </TabsContent>

            {canReadAr ? (
              <TabsContent value="payments">
                <CustomerPaymentsPanel activity={activity} />
              </TabsContent>
            ) : null}

            <TabsContent value="credit" className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-base font-semibold">Credit limit</h2>
                <p className="text-sm text-muted-foreground">
                  Current limit
                  {" "}
                  {credit?.creditLimitAmount != null
                    ? formatMoney(credit.creditLimitAmount, currency)
                    : party.creditLimitAmount != null
                      ? formatMoney(party.creditLimitAmount, currency)
                      : "is not set"}
                  . Adjust it here. Credit notes that reduce what this customer owes are listed below.
                </p>
                <CustomerCreditTab partyId={id} onSaved={() => void load()} />
              </section>
              <section className="space-y-3">
                <h2 className="text-base font-semibold">Credit notes</h2>
                <CustomerCreditNotes activity={activity} />
              </section>
            </TabsContent>

            {canReadAr ? (
              <TabsContent value="ledger">
                <CustomerLedger partyId={id} partyName={party.name} canEmail={canWriteFinance} />
              </TabsContent>
            ) : null}
          </Tabs>
        )}
      </div>
      <CustomerFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        fmcg={fmcg}
        customerId={id}
        onSuccess={() => {
          void load();
        }}
      />
    </PageShell>
  );
}
