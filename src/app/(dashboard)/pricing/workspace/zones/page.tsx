"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPricingZone,
  fetchFranchisePricingProfiles,
  fetchPricingZones,
  type FranchisePricingProfileRow,
} from "@/lib/api/pricing-engine";
import { fetchFranchiseNetworkOutlets } from "@/lib/api/cool-catch";
import {
  createPriceListApi,
  fetchDailyPriceStatusApi,
  fetchPriceListsForUi,
  updatePriceListApi,
} from "@/lib/api/pricing";
import { PRICING_MARKET_TIERS } from "@/lib/pricing/engine-types";
import { toast } from "sonner";
import { CheckCircle2, Circle, Link2, Plus, Tag } from "lucide-react";

import {
  franchiseMastersForZone,
  isFranchiseList,
  pickCanonicalZoneMaster,
} from "@/lib/pricing/franchise-zone-master";

export default function PricingZonesPage() {
  const [zones, setZones] = React.useState<Awaited<ReturnType<typeof fetchPricingZones>>>([]);
  const [profiles, setProfiles] = React.useState<FranchisePricingProfileRow[]>([]);
  const [outlets, setOutlets] = React.useState<Awaited<ReturnType<typeof fetchFranchiseNetworkOutlets>>>([]);
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  const [dailyStaleByList, setDailyStaleByList] = React.useState<Map<string, number>>(new Map());
  const [name, setName] = React.useState("");
  const [tier, setTier] = React.useState("TIER_1");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [linkingZoneId, setLinkingZoneId] = React.useState<string | null>(null);
  const [creatingMasterZoneId, setCreatingMasterZoneId] = React.useState<string | null>(null);
  const [linkListByZone, setLinkListByZone] = React.useState<Record<string, string>>({});
  const [replacingZoneId, setReplacingZoneId] = React.useState<string | null>(null);
  const [replaceListByZone, setReplaceListByZone] = React.useState<Record<string, string>>({});

  const reload = React.useCallback(async () => {
    const [z, p, o, pl, dailyStatus] = await Promise.all([
      fetchPricingZones().catch(() => []),
      fetchFranchisePricingProfiles().catch(() => []),
      fetchFranchiseNetworkOutlets().catch(() => []),
      fetchPriceListsForUi().catch(() => []),
      fetchDailyPriceStatusApi().catch(() => ({ lists: [] as { priceListId: string; staleCount: number }[] })),
    ]);
    setZones(z);
    setProfiles(p);
    setOutlets(o);
    setPriceLists(pl);
    const staleMap = new Map<string, number>();
    for (const row of dailyStatus.lists ?? []) {
      staleMap.set(row.priceListId, row.staleCount);
    }
    setDailyStaleByList(staleMap);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const zoneLists = (zoneId: string) => franchiseMastersForZone(priceLists, zoneId);

  const allZonesHaveMaster = zones.length > 0 && zones.every((z) => Boolean(pickCanonicalZoneMaster(priceLists, z.id)));
  const unlinkedFranchiseMasters = priceLists.filter(
    (pl) => isFranchiseList(pl) && !pl.parentPriceListId && !pl.zoneId
  );

  const outletsInZone = (zoneId: string) => profiles.filter((p) => p.zoneId === zoneId).length;
  const allOutletsAssigned =
    outlets.length === 0 || outlets.every((o) => profiles.some((p) => p.franchiseId === o.franchiseeRegistryId));
  const allMastersPublished =
    zones.length === 0 ||
    zones.every((z) => {
      const master = pickCanonicalZoneMaster(priceLists, z.id);
      if (!master) return false;
      return (dailyStaleByList.get(master.id) ?? 0) === 0;
    });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Zone name is required.");
      return;
    }
    setSaving(true);
    try {
      await createPricingZone({ name: name.trim(), tier, description: description.trim() || undefined });
      toast.success("Zone created");
      setName("");
      setDescription("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create zone");
    } finally {
      setSaving(false);
    }
  };

  const handleLinkList = async (zoneId: string) => {
    const listId = linkListByZone[zoneId];
    if (!listId) {
      toast.error("Select a price list to link.");
      return;
    }
    const zone = zones.find((z) => z.id === zoneId);
    setLinkingZoneId(zoneId);
    try {
      await updatePriceListApi(listId, {
        zoneId,
        channel: "FRANCHISE",
        tier: zone?.tier ?? null,
      });
      toast.success("Franchise master list linked to zone");
      setLinkListByZone((prev) => ({ ...prev, [zoneId]: "" }));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link list");
    } finally {
      setLinkingZoneId(null);
    }
  };

  const handleReplaceMaster = async (zoneId: string) => {
    const listId = replaceListByZone[zoneId];
    if (!listId) {
      toast.error("Select a price list to replace the current master.");
      return;
    }
    const zone = zones.find((z) => z.id === zoneId);
    const current = pickCanonicalZoneMaster(priceLists, zoneId);
    if (current && current.id === listId) {
      toast.error("That list is already the zone master.");
      return;
    }
    if (
      !window.confirm(
        "Replace the zone master? The previous master will be unlinked from this zone. Outlets will inherit prices from the new master after you re-save their zone assignment."
      )
    ) {
      return;
    }
    setReplacingZoneId(zoneId);
    try {
      await updatePriceListApi(listId, {
        zoneId,
        channel: "FRANCHISE",
        tier: zone?.tier ?? null,
      });
      toast.success("Zone master replaced");
      setReplaceListByZone((prev) => ({ ...prev, [zoneId]: "" }));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not replace master");
    } finally {
      setReplacingZoneId(null);
    }
  };

  const handleCreateMaster = async (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    setCreatingMasterZoneId(zoneId);
    try {
      const code = `ZONE-${zone.name.replace(/\s+/g, "-").slice(0, 20).toUpperCase()}-${zoneId.slice(0, 6)}`;
      const { id } = await createPriceListApi({
        name: `${zone.name} — Franchise`,
        code,
        currency: "KES",
        channel: "FRANCHISE",
        tier: zone.tier,
        zoneId,
      });
      toast.success("Franchise master list created");
      await reload();
      window.location.href = `/pricing/price-lists/${id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create master list");
    } finally {
      setCreatingMasterZoneId(null);
    }
  };

  const checklist = [
    { done: zones.length > 0, label: "Pricing zones created", href: undefined },
    { done: allZonesHaveMaster, label: "Each zone has a FRANCHISE master price list", href: undefined },
    {
      done: allOutletsAssigned,
      label: "Outlets assigned to zones",
      href: "/franchise/network/outlets",
    },
    {
      done: allMastersPublished,
      label: "Today's prices published on zone masters",
      href: "/pricing/workspace/lists",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Franchise pricing zones"
        description="Set prices once per zone on the master list — all outlets in the zone inherit. Override per outlet on the derived list if needed."
        breadcrumbs={[
          { label: "Pricing", href: "/pricing/workspace/overview" },
          { label: "Zones" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/franchise/network/outlets">Assign outlets</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup checklist</CardTitle>
            <CardDescription>
              Zone → master list → publish today&apos;s prices → assign outlets. WhatsApp and mobile Sell use
              the published shelf price.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  {item.href && !item.done ? (
                    <Link href={item.href} className="text-primary underline">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={item.done ? "text-muted-foreground" : ""}>{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add pricing zone</CardTitle>
            <CardDescription>
              After creating a zone, link or create a FRANCHISE master list below, then set today&apos;s prices
              on that list.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone 1 — Nairobi" />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_MARKET_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Creating…" : "Create zone"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zones</CardTitle>
            <CardDescription>
              One FRANCHISE master list per zone. Outlets in the zone inherit prices from the master (with
              optional per-outlet overrides).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Franchise master list</TableHead>
                  <TableHead>Outlets in zone</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No zones yet. Create one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((z) => {
                    const masters = zoneLists(z.id);
                    const master = pickCanonicalZoneMaster(priceLists, z.id);
                    const extraMasters = masters.filter((m) => m.id !== master?.id);
                    const outletCount = outletsInZone(z.id);
                    const staleCount = master ? (dailyStaleByList.get(master.id) ?? 0) : 0;
                    const replaceCandidates = unlinkedFranchiseMasters.filter((pl) => pl.id !== master?.id);
                    return (
                      <TableRow key={z.id}>
                        <TableCell className="font-medium">{z.name}</TableCell>
                        <TableCell>{z.tier ?? "—"}</TableCell>
                        <TableCell>
                          {master ? (
                            <div className="space-y-1">
                              <Link
                                href={`/pricing/price-lists/${master.id}`}
                                className="block text-sm text-primary underline"
                              >
                                {master.name}
                              </Link>
                              {extraMasters.length > 0 ? (
                                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                                  {extraMasters.length} other linked master{extraMasters.length > 1 ? "s" : ""} — only
                                  the most recently updated drives outlets.
                                </p>
                              ) : null}
                              {staleCount > 0 ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                                  {staleCount} need today&apos;s price
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                                  Prices up to date
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-end gap-2">
                              {unlinkedFranchiseMasters.length > 0 ? (
                                <>
                                  <Select
                                    value={linkListByZone[z.id] || "__none__"}
                                    onValueChange={(v) =>
                                      setLinkListByZone((prev) => ({
                                        ...prev,
                                        [z.id]: v === "__none__" ? "" : v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-[180px] text-xs">
                                      <SelectValue placeholder="Link existing…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">— Select list —</SelectItem>
                                      {unlinkedFranchiseMasters.map((pl) => (
                                        <SelectItem key={pl.id} value={pl.id}>
                                          {pl.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    disabled={linkingZoneId === z.id || !linkListByZone[z.id]}
                                    onClick={() => void handleLinkList(z.id)}
                                  >
                                    <Link2 className="h-3.5 w-3.5 mr-1" />
                                    Link
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8"
                                disabled={creatingMasterZoneId === z.id}
                                onClick={() => void handleCreateMaster(z.id)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Create master
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {outletCount > 0 ? (
                            <Link
                              href="/franchise/network/outlets"
                              className="text-sm text-primary underline"
                            >
                              {outletCount} outlet{outletCount > 1 ? "s" : ""}
                            </Link>
                          ) : (
                            <Link
                              href="/franchise/network/outlets"
                              className="text-sm text-muted-foreground underline"
                            >
                              Assign outlets
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          {master ? (
                            <div className="space-y-2">
                              <Button size="sm" asChild>
                                <Link href={`/pricing/price-lists/${master.id}`}>
                                  <Tag className="h-3.5 w-3.5 mr-1" />
                                  Set prices
                                </Link>
                              </Button>
                              {replaceCandidates.length > 0 ? (
                                <div className="flex flex-wrap items-end gap-2">
                                  <Select
                                    value={replaceListByZone[z.id] || "__none__"}
                                    onValueChange={(v) =>
                                      setReplaceListByZone((prev) => ({
                                        ...prev,
                                        [z.id]: v === "__none__" ? "" : v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-[180px] text-xs">
                                      <SelectValue placeholder="Replace master…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">— Select list —</SelectItem>
                                      {replaceCandidates.map((pl) => (
                                        <SelectItem key={pl.id} value={pl.id}>
                                          {pl.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    disabled={replacingZoneId === z.id || !replaceListByZone[z.id]}
                                    onClick={() => void handleReplaceMaster(z.id)}
                                  >
                                    Replace master
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
