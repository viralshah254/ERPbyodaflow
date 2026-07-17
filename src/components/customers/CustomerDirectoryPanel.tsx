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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { PartyRow } from "@/lib/types/masters";
import { isApiConfigured } from "@/lib/api/client";
import { SupermarketBranchesSheet } from "@/components/customers/SupermarketBranchesSheet";

type TabId = (typeof CUSTOMER_DIRECTORY_TABS)[number]["id"];

export type CustomerDirectoryPanelProps = {
  fmcg: boolean;
  segmentTabs?: boolean;
  onAddCustomer?: (kindId?: CustomerKindId) => void;
  onEditCustomer?: (customerId: string) => void;
  /** Open modern-trade branch flow; optional supermarket preselect. */
  onAddBranch?: (supermarketId?: string) => void;
  /** Reload supermarket list after branch create (from hub). */
  branchListRefreshKey?: number;
  /** Controlled tab — e.g. switch to Distributors after creating one. */
  activeTab?: TabId;
  onActiveTabChange?: (tab: TabId) => void;
};

export function CustomerDirectoryPanel({
  fmcg,
  segmentTabs = fmcg,
  onAddCustomer,
  onEditCustomer,
  onAddBranch,
  branchListRefreshKey = 0,
  activeTab: activeTabProp,
  onActiveTabChange,
}: CustomerDirectoryPanelProps) {
  const router = useRouter();
  const [internalTab, setInternalTab] = React.useState<TabId>("modern-trade");
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = React.useCallback(
    (tab: TabId) => {
      if (onActiveTabChange) onActiveTabChange(tab);
      else setInternalTab(tab);
    },
    [onActiveTabChange]
  );
  const [search, setSearch] = React.useState("");
  const [parties, setParties] = React.useState<PartyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [branchesSupermarket, setBranchesSupermarket] = React.useState<PartyRow | null>(null);
  const [branchesOpen, setBranchesOpen] = React.useState(false);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, segmentTabs, tabConfig]);

  React.useEffect(() => {
    void loadParties();
  }, [loadParties]);

  React.useEffect(() => {
    if (branchListRefreshKey === 0) return;
    void loadParties();
  }, [branchListRefreshKey, loadParties]);

  // After create, hub switches tab — clear search so the new customer isn't filtered out.
  React.useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const requestAdd = (kindId?: CustomerKindId) => {
    onAddCustomer?.(kindId ?? (segmentTabs ? (activeTab as CustomerKindId) : undefined));
  };

  const openBranches = (party: PartyRow) => {
    setBranchesSupermarket(party);
    setBranchesOpen(true);
  };

  const renderModernTradeTable = () => (
    <div className={LIST_TABLE_SURFACE_CLASS}>
      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      ) : parties.length === 0 ? (
        <EmptyState
          icon="Users"
          title="No modern trade yet"
          description="Add a supermarket (chain HQ), then open Branches to add outlets."
          action={{
            label: "Add supermarket",
            onClick: () => requestAdd("modern-trade"),
          }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supermarket</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-right w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties.map((party) => (
              <TableRow key={party.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{party.name}</p>
                    {party.tradingName ? (
                      <p className="text-xs text-muted-foreground truncate">{party.tradingName}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{party.code || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{party.phone || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {party.address?.city || party.address?.line1 || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      title="Branches"
                      aria-label={`Branches for ${party.name}`}
                      onClick={() => openBranches(party)}
                    >
                      <Icons.GitBranch className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onEditCustomer
                          ? onEditCustomer(party.id)
                          : router.push(`/master/parties?party=${party.id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => router.push(`/docs/sales-order/new?party=${party.id}`)}
                    >
                      Order
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  const renderPartyList = (tabId?: TabId, tabLabel?: string) => {
    if (tabId === "modern-trade") {
      return renderModernTradeTable();
    }

    return (
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
                      {party.channel ? (
                        <Badge variant="outline">{channelLabel(party.channel)}</Badge>
                      ) : null}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const searchRow = (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="flex-1 max-w-md space-y-1">
        <Label htmlFor="customer-directory-search">
          {segmentTabs && activeTab === "modern-trade" ? "Search supermarkets" : "Search"}
        </Label>
        <Input
          id="customer-directory-search"
          placeholder="Name, code, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void loadParties()} disabled={loading}>
          Refresh
        </Button>
        {onAddCustomer ? (
          <Button onClick={() => requestAdd()}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            {segmentTabs && activeTab === "modern-trade" ? "Add supermarket" : "Add customer"}
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

      {onAddBranch ? (
        <SupermarketBranchesSheet
          open={branchesOpen}
          onOpenChange={setBranchesOpen}
          supermarket={branchesSupermarket}
          refreshKey={branchListRefreshKey}
          onAddBranch={(supermarketId) => {
            onAddBranch(supermarketId);
          }}
        />
      ) : null}
    </>
  );
}
