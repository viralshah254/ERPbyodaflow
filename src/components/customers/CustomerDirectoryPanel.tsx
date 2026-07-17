"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
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
import {
  CUSTOMER_DIRECTORY_TABS,
  channelLabel,
  sfaSegmentLabel,
  type CustomerKindId,
} from "@/lib/fmcg/sfa-customer";
import { fetchPartiesApi } from "@/lib/api/parties";
import { createPartySiteApi, fetchPartySitesApi, type PartySiteRow } from "@/lib/api/party-sites";
import type { PartyRow } from "@/lib/types/masters";
import { isApiConfigured } from "@/lib/api/client";

type TabId = (typeof CUSTOMER_DIRECTORY_TABS)[number]["id"];

export type CustomerDirectoryPanelProps = {
  fmcg: boolean;
  segmentTabs?: boolean;
  onAddCustomer?: (kindId?: CustomerKindId) => void;
  onEditCustomer?: (customerId: string) => void;
};

export function CustomerDirectoryPanel({
  fmcg,
  segmentTabs = fmcg,
  onAddCustomer,
  onEditCustomer,
}: CustomerDirectoryPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>("modern-trade");
  const [search, setSearch] = React.useState("");
  const [parties, setParties] = React.useState<PartyRow[]>([]);
  const [sitesByParty, setSitesByParty] = React.useState<Record<string, PartySiteRow[]>>({});
  const [loading, setLoading] = React.useState(true);

  const [branchOpen, setBranchOpen] = React.useState(false);
  const [branchPartyId, setBranchPartyId] = React.useState<string | null>(null);
  const [branchName, setBranchName] = React.useState("");
  const [branchCode, setBranchCode] = React.useState("");
  const [branchAddress, setBranchAddress] = React.useState("");
  const [branchPhone, setBranchPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const tabConfig = segmentTabs ? CUSTOMER_DIRECTORY_TABS.find((t) => t.id === activeTab)! : null;

  const loadParties = React.useCallback(async () => {
    if (!isApiConfigured()) {
      setParties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await fetchPartiesApi({
        role: "customer",
        sfaSegment: segmentTabs && tabConfig ? tabConfig.sfaSegment : undefined,
        channel: segmentTabs && tabConfig && "channel" in tabConfig ? tabConfig.channel : undefined,
        search: search.trim() || undefined,
        status: "ACTIVE",
      });
      setParties(items);
      if (segmentTabs && activeTab === "modern-trade" && items.length > 0) {
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
  }, [activeTab, search, segmentTabs, tabConfig]);

  React.useEffect(() => {
    void loadParties();
  }, [loadParties]);

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
        phone: branchPhone.trim() || undefined,
        address: branchAddress.trim() ? { line1: branchAddress.trim() } : undefined,
        siteType: "BRANCH",
        status: "ACTIVE",
      });
      toast.success("Branch added");
      setBranchOpen(false);
      setBranchName("");
      setBranchCode("");
      setBranchAddress("");
      setBranchPhone("");
      await loadParties();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add branch");
    } finally {
      setSaving(false);
    }
  };

  const requestAdd = (kindId?: CustomerKindId) => {
    onAddCustomer?.(kindId ?? (segmentTabs ? (activeTab as CustomerKindId) : undefined));
  };

  const renderPartyList = (tabId?: TabId, tabLabel?: string) => (
    <div className={LIST_TABLE_SURFACE_CLASS}>
      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      ) : parties.length === 0 ? (
        <EmptyState
          icon="Users"
          title={tabLabel ? `No ${tabLabel.toLowerCase()} yet` : "No customers yet"}
          description="Add a customer to start selling and invoicing."
          action={{
            label: tabLabel ? `Add ${tabLabel.toLowerCase()}` : "Add customer",
            onClick: () => requestAdd(tabId as CustomerKindId | undefined),
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
                    {party.tradingName ? (
                      <span className="text-sm text-muted-foreground truncate">
                        ({party.tradingName})
                      </span>
                    ) : null}
                    {party.code ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {party.code}
                      </Badge>
                    ) : null}
                    {party.sfaSegment ? (
                      <Badge variant="secondary">{sfaSegmentLabel(party.sfaSegment)}</Badge>
                    ) : null}
                    {party.channel ? <Badge variant="outline">{channelLabel(party.channel)}</Badge> : null}
                    {party.route ? (
                      <Badge variant="outline" className="font-normal">
                        Route {party.route}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[party.phone, party.email, party.address?.city || party.address?.line1]
                      .filter(Boolean)
                      .join(" · ") || "No contact on file"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {tabId === "modern-trade" ? (
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
                    onClick={() =>
                      onEditCustomer
                        ? onEditCustomer(party.id)
                        : router.push(`/master/parties?party=${party.id}`)
                    }
                  >
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => router.push(`/docs/sales-order/new?party=${party.id}`)}>
                    New order
                  </Button>
                </div>
              </div>

              {tabId === "modern-trade" && (sitesByParty[party.id]?.length ?? 0) > 0 ? (
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
                        {site.address?.line1 ? (
                          <span className="text-muted-foreground text-xs">{site.address.line1}</span>
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
  );

  const searchRow = (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="flex-1 max-w-md space-y-1">
        <Label htmlFor="customer-directory-search">Search</Label>
        <Input
          id="customer-directory-search"
          placeholder="Name, code, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => void loadParties()} disabled={loading}>
          Refresh
        </Button>
        {onAddCustomer ? (
          <Button onClick={() => requestAdd()}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add customer
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {segmentTabs ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {CUSTOMER_DIRECTORY_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-4">{searchRow}</div>
          {CUSTOMER_DIRECTORY_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              {renderPartyList(tab.id, tab.label)}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-4">
          {searchRow}
          {renderPartyList()}
        </div>
      )}

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
              <Label htmlFor="branch-code">Branch code</Label>
              <Input
                id="branch-code"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="For LPO / order matching"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Phone</Label>
              <Input
                id="branch-phone"
                value={branchPhone}
                onChange={(e) => setBranchPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">Address</Label>
              <Input
                id="branch-address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={() => void handleCreateBranch()} disabled={saving}>
              {saving ? "Saving…" : "Add branch"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
