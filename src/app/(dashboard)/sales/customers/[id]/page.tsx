"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyStatementPanel } from "@/components/finance/PartyStatementPanel";
import { PartyDocumentsPanel } from "@/components/finance/PartyDocumentsPanel";
import { CustomerCreditTab } from "@/components/customers/CustomerCreditTab";
import { fetchPartyByIdApi, fetchPartyCreditSummaryApi, type PartyDetail } from "@/lib/api/parties";
import type { PartyCreditSummary } from "@/lib/api/parties";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { formatMoney } from "@/lib/money";
import { can } from "@/lib/rbac/can";
import { useCanWriteFinance } from "@/lib/rbac/use-write-guard";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const TABS = ["overview", "ledger", "documents", "credit"] as const;
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
  const { settings } = useFinancialSettings();
  const currency = settings.baseCurrency?.trim()?.toUpperCase() || "KES";

  const requested = searchParams.get("tab");
  const initialTab: TabId =
    isTab(requested) && (requested !== "ledger" || canReadAr) ? requested : "overview";
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
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/sales/customers/${encodeURIComponent(id)}?${params.toString()}`, { scroll: false });
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

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={party?.name ?? "Customer"}
        description={party?.code ? `Code ${party.code}` : "Customer ledger and documents"}
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
            <Button asChild>
              <Link href={`/docs/sales-order/new?party=${encodeURIComponent(id)}`}>
                <Icons.ShoppingCart className="mr-2 h-4 w-4" />
                New order
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading customer…</p>
        ) : !party ? (
          <p className="text-sm text-muted-foreground">Customer not found.</p>
        ) : (
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="mb-4 flex h-auto flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {canReadAr ? <TabsTrigger value="ledger">Ledger</TabsTrigger> : null}
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="credit">Credit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {canReadAr
                      ? formatMoney(credit?.outstandingBalance ?? 0, currency)
                      : "—"}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Credit limit</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {credit?.creditLimitAmount != null
                      ? formatMoney(credit.creditLimitAmount, currency)
                      : party.creditLimitAmount != null
                        ? formatMoney(party.creditLimitAmount, currency)
                        : "No limit"}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {credit?.utilizationPct != null ? `${Math.round(credit.utilizationPct)}%` : "—"}
                    </p>
                    {party.onHold ? <Badge variant="destructive">On hold</Badge> : null}
                  </CardContent>
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
                </CardContent>
              </Card>
            </TabsContent>

            {canReadAr ? (
              <TabsContent value="ledger">
                <PartyStatementPanel
                  kind="customer"
                  partyId={id}
                  canEmail={canWriteFinance}
                  defaultAllTime
                  hideAccountCard
                />
              </TabsContent>
            ) : null}

            <TabsContent value="documents">
              <PartyDocumentsPanel kind="customer" partyId={id} />
            </TabsContent>

            <TabsContent value="credit">
              <CustomerCreditTab partyId={id} onSaved={() => void load()} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}
