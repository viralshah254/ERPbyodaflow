"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useOrgContext } from "@/stores/orgContextStore";
import {
  CUSTOMER_DIRECTORY_TABS,
  channelLabel,
  isFmcgOrg,
  sfaSegmentLabel,
} from "@/lib/fmcg/sfa-customer";
import { fetchPartiesApi, createPartyApi, type PartyPayload } from "@/lib/api/parties";
import { createPartySiteApi, fetchPartySitesApi, type PartySiteRow } from "@/lib/api/party-sites";
import type { PartyRow, SfaSegment } from "@/lib/types/masters";
import { isApiConfigured } from "@/lib/api/client";

type TabId = (typeof CUSTOMER_DIRECTORY_TABS)[number]["id"];

function defaultCustomerType(segment: SfaSegment): PartyPayload["customerType"] {
  if (segment === "DISTRIBUTOR") return "DISTRIBUTOR";
  if (segment === "VAN_SALES") return "WHOLESALER";
  return "RETAILER";
}

export default function CustomerDirectoryPage() {
  const router = useRouter();
  const { templateId } = useOrgContext();
  const fmcg = isFmcgOrg(templateId);

  const [activeTab, setActiveTab] = React.useState<TabId>("modern-trade");
  const [search, setSearch] = React.useState("");
  const [parties, setParties] = React.useState<PartyRow[]>([]);
  const [sitesByParty, setSitesByParty] = React.useState<Record<string, PartySiteRow[]>>({});
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createCode, setCreateCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [branchOpen, setBranchOpen] = React.useState(false);
  const [branchPartyId, setBranchPartyId] = React.useState<string | null>(null);
  const [branchName, setBranchName] = React.useState("");
  const [branchCode, setBranchCode] = React.useState("");

  const tabConfig = CUSTOMER_DIRECTORY_TABS.find((t) => t.id === activeTab)!;

  const loadParties = React.useCallback(async () => {
    if (!isApiConfigured() || !fmcg) {
      setParties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await fetchPartiesApi({
        role: "customer",
        sfaSegment: tabConfig.sfaSegment,
        channel: "channel" in tabConfig ? tabConfig.channel : undefined,
        search: search.trim() || undefined,
        status: "ACTIVE",
      });
      setParties(items);
      if (activeTab === "modern-trade" && items.length > 0) {
        const siteEntries = await Promise.all(
          items.map(async (p) => {
            const { items: sites } = await fetchPartySitesApi({ partyId: p.id });
            return [p.id, sites] as const;
          })
        );
        setSitesByParty(Object.fromEntries(siteEntries));
      } else {
        setSitesByParty({});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [activeTab, fmcg, search, tabConfig]);

  React.useEffect(() => {
    void loadParties();
  }, [loadParties]);

  const handleCreateCustomer = async () => {
    if (!createName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: PartyPayload = {
        name: createName.trim(),
        roles: ["customer"],
        code: createCode.trim() || undefined,
        customerType: defaultCustomerType(tabConfig.sfaSegment),
        channel:
          ("channel" in tabConfig ? tabConfig.channel : undefined) ??
          (tabConfig.sfaSegment.startsWith("MODERN") ? "MODERN_TRADE" : "GENERAL_TRADE"),
        sfaSegment: tabConfig.sfaSegment,
        status: "ACTIVE",
      };
      await createPartyApi(payload);
      toast.success("Customer created");
      setCreateOpen(false);
      setCreateName("");
      setCreateCode("");
      await loadParties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchPartyId || !branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }
    setSaving(true);
    try {
      await createPartySiteApi({
        partyId: branchPartyId,
        name: branchName.trim(),
        code: branchCode.trim() || undefined,
        siteType: "BRANCH",
        status: "ACTIVE",
      });
      toast.success("Branch added");
      setBranchOpen(false);
      setBranchName("");
      setBranchCode("");
      await loadParties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add branch");
    } finally {
      setSaving(false);
    }
  };

  if (!fmcg) {
    return (
      <PageShell className={LIST_PAGE_SHELL_CLASS}>
        <PageHeader title="Customer directory" description="FMCG customer segments and outlets." />
        <EmptyState
          icon="Users"
          title="Not available for this organisation"
          description="Customer directory is for FMCG manufacturers and distributors. Use Sales → Customers or Master → Parties."
          action={{
            label: "Go to customers",
            onClick: () => router.push("/sales/customers"),
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Customer directory"
        description="Modern trade outlets, general trade clients, distributors, and van sales — source of truth for Odaflow SFA orders."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/master/parties">Master parties</Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Icons.Plus className="h-4 w-4 mr-2" />
              Add customer
            </Button>
          </div>
        }
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {CUSTOMER_DIRECTORY_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 max-w-md space-y-1">
              <Label htmlFor="customer-search">Search</Label>
              <Input
                id="customer-search"
                placeholder="Name, code, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={() => void loadParties()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {CUSTOMER_DIRECTORY_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <div className={LIST_TABLE_SURFACE_CLASS}>
                {loading ? (
                  <p className="p-6 text-sm text-muted-foreground">Loading…</p>
                ) : parties.length === 0 ? (
                  <EmptyState
                    icon="Users"
                    title={`No ${tab.label.toLowerCase()} yet`}
                    description="Add customers here or sync from Odaflow SFA once integration is connected."
                    action={{
                      label: `Add ${tab.label.toLowerCase()}`,
                      onClick: () => setCreateOpen(true),
                    }}
                  />
                ) : (
                  <ul className="divide-y">
                    {parties.map((party) => (
                      <li key={party.id} className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-medium truncate">{party.name}</p>
                              {party.code ? (
                                <Badge variant="outline" className="font-mono text-xs">
                                  {party.code}
                                </Badge>
                              ) : null}
                              <Badge variant="secondary">{sfaSegmentLabel(party.sfaSegment)}</Badge>
                              {party.channel ? (
                                <Badge variant="outline">{channelLabel(party.channel)}</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {[party.email, party.phone].filter(Boolean).join(" · ") || "No contact on file"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            {tab.id === "modern-trade" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setBranchPartyId(party.id);
                                  setBranchOpen(true);
                                }}
                              >
                                Add branch
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/master/parties?party=${party.id}`)}
                            >
                              Edit
                            </Button>
                            <Button size="sm" onClick={() => router.push(`/docs/sales-order/new?party=${party.id}`)}>
                              New order
                            </Button>
                          </div>
                        </div>

                        {tab.id === "modern-trade" && (sitesByParty[party.id]?.length ?? 0) > 0 ? (
                          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                              Branches / outlets
                            </p>
                            <ul className="space-y-2">
                              {sitesByParty[party.id].map((site) => (
                                <li key={site.id} className="flex flex-wrap items-center gap-2 text-sm">
                                  <Icons.MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">{site.name}</span>
                                  {site.code ? (
                                    <span className="text-muted-foreground font-mono text-xs">{site.code}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add {tabConfig.label.toLowerCase()}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Name</Label>
              <Input id="cust-name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-code">Code (optional)</Label>
              <Input id="cust-code" value={createCode} onChange={(e) => setCreateCode(e.target.value)} />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={() => void handleCreateCustomer()} disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={branchOpen} onOpenChange={setBranchOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add branch / outlet</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input id="branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-code">Branch code (for LPO matching)</Label>
              <Input id="branch-code" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={() => void handleCreateBranch()} disabled={saving}>
              {saving ? "Saving…" : "Add branch"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
