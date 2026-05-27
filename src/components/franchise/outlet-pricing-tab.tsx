"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FranchiseProductEconomicsSection } from "@/components/franchise/franchise-product-economics-section";
import { assignOutletPricingZone, fetchOutletRetailPricePreview } from "@/lib/api/franchise-pricing";
import { fetchPricingZones } from "@/lib/api/pricing-engine";
import { fetchDailyPriceStatusApi, fetchPriceListsForUi } from "@/lib/api/pricing";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { RefreshCw, Tag } from "lucide-react";

import { pickCanonicalZoneMaster } from "@/lib/pricing/franchise-zone-master";

export function OutletPricingTab({
  outletOrgId,
  assignedPriceListId,
  assignedZoneId,
  assignedZoneName,
  franchiseeRegistryId,
  onAssigned,
}: {
  outletOrgId: string;
  assignedPriceListId?: string | null;
  assignedZoneId?: string | null;
  assignedZoneName?: string | null;
  franchiseeRegistryId?: string | null;
  onAssigned?: () => void;
}) {
  const [zones, setZones] = React.useState<Awaited<ReturnType<typeof fetchPricingZones>>>([]);
  const [priceLists, setPriceLists] = React.useState<Awaited<ReturnType<typeof fetchPriceListsForUi>>>([]);
  const [zoneId, setZoneId] = React.useState(assignedZoneId ?? "");
  const [savingZone, setSavingZone] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<Awaited<ReturnType<typeof fetchOutletRetailPricePreview>> | null>(
    null
  );
  const [masterStaleCount, setMasterStaleCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    Promise.all([fetchPricingZones(), fetchPriceListsForUi()])
      .then(([z, pl]) => {
        setZones(z);
        setPriceLists(pl);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    setZoneId(assignedZoneId ?? "");
  }, [assignedZoneId]);

  const activeZone = zones.find((z) => z.id === (zoneId || assignedZoneId));
  const zoneMaster =
    zoneId || assignedZoneId
      ? pickCanonicalZoneMaster(priceLists, zoneId || assignedZoneId || "")
      : undefined;
  const assignedList = assignedPriceListId
    ? priceLists.find((pl) => pl.id === assignedPriceListId)
    : undefined;
  const derivedListId = assignedPriceListId ?? preview?.priceListId ?? assignedList?.id;

  React.useEffect(() => {
    if (!zoneMaster?.id) {
      setMasterStaleCount(null);
      return;
    }
    fetchDailyPriceStatusApi()
      .then((status) => {
        const row = status.lists.find((l) => l.priceListId === zoneMaster.id);
        setMasterStaleCount(row?.staleCount ?? null);
      })
      .catch(() => setMasterStaleCount(null));
  }, [zoneMaster?.id]);

  const loadPreview = React.useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await fetchOutletRetailPricePreview(outletOrgId);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [outletOrgId]);

  React.useEffect(() => {
    void loadPreview();
  }, [loadPreview, assignedPriceListId]);

  const listMismatch =
    Boolean(zoneMaster && assignedList?.parentPriceListId) &&
    assignedList?.parentPriceListId !== zoneMaster?.id;

  const handleZoneSave = async () => {
    if (!zoneId) return;
    setSavingZone(true);
    try {
      await assignOutletPricingZone(outletOrgId, zoneId);
      toast.success("Pricing zone assigned");
      onAssigned?.();
      await loadPreview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign zone");
    } finally {
      setSavingZone(false);
    }
  };

  const previewItems = (preview?.items ?? []).filter(
    (i) => (i.retailPrice != null && i.retailPrice > 0) || (i.zoneBasePrice != null && i.zoneBasePrice > 0)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing zone</CardTitle>
          <CardDescription>
            Pick one zone — shelf prices inherit from that zone&apos;s master list. Set base prices on the zone
            master; add commission per SKU below if this shop should charge more.
            {assignedZoneName ? ` Current: ${assignedZoneName}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zoneId && !zoneMaster && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              This zone has no FRANCHISE master price list yet.{" "}
              <Link href="/pricing/workspace/zones" className="underline font-medium">
                Link or create a master on Franchise zones
              </Link>{" "}
              before assigning outlets.
            </div>
          )}
          {zoneMaster && masterStaleCount != null && masterStaleCount > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Zone master{" "}
              <Link href={`/pricing/price-lists/${zoneMaster.id}`} className="underline font-medium">
                {zoneMaster.name}
              </Link>{" "}
              has {masterStaleCount} product{masterStaleCount > 1 ? "s" : ""} without today&apos;s price — shops
              in this zone cannot sell those SKUs until you publish.
            </div>
          )}
          {listMismatch && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              Outlet price list is out of sync with the zone master. Save the zone again to re-wire the derived
              list.
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[220px]">
              <Label>Zone</Label>
              <Select value={zoneId || "__none__"} onValueChange={(v) => setZoneId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select zone…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                      {z.tier ? ` (${z.tier})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void handleZoneSave()} disabled={savingZone || !zoneId}>
              {savingZone ? "Saving…" : "Save zone"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pricing/workspace/zones">Manage zones</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {(activeZone || zoneMaster || assignedList) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price inheritance</CardTitle>
            <CardDescription>
              Base prices are published on the zone master. This outlet&apos;s derived list inherits those prices
              automatically — use it only for per-outlet daily overrides, not as the main price sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Zone tier</p>
              <p className="font-medium">
                {activeZone ? `${activeZone.name}${activeZone.tier ? ` · ${activeZone.tier}` : ""}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Zone master (set base here)</p>
              {zoneMaster ? (
                <Link href={`/pricing/price-lists/${zoneMaster.id}`} className="text-primary underline font-medium">
                  {zoneMaster.name}
                </Link>
              ) : (
                <p className="text-muted-foreground">Not linked</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Outlet derived list</p>
              {derivedListId ? (
                <div className="space-y-1">
                  <Link
                    href={`/pricing/price-lists/${derivedListId}`}
                    className="text-primary underline font-medium"
                  >
                    {assignedList?.name ?? preview?.priceListName ?? "Outlet prices"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Inherits from{" "}
                    {zoneMaster ? (
                      <Link href={`/pricing/price-lists/${zoneMaster.id}`} className="underline">
                        {zoneMaster.name}
                      </Link>
                    ) : (
                      "zone master"
                    )}
                    . Optional: set daily overrides on this list if this shop needs a different shelf price for
                    specific SKUs.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Created when you save a zone</p>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
              {zoneMaster ? (
                <Button size="sm" variant="default" asChild>
                  <Link href={`/pricing/price-lists/${zoneMaster.id}`}>
                    <Tag className="h-3.5 w-3.5 mr-1" />
                    Set zone prices
                  </Link>
                </Button>
              ) : null}
              {derivedListId ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/pricing/price-lists/${derivedListId}`}>Per-outlet overrides</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <FranchiseProductEconomicsSection
        franchiseeRegistryId={franchiseeRegistryId ?? undefined}
        outletOrgId={outletOrgId}
        zoneMasterListId={zoneMaster?.id}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Published retail preview</CardTitle>
            <CardDescription>
              Guide retail matches WhatsApp and POS (zone base + commission). Base comes from the zone master
              publish chain.
              {preview?.priceListName ? ` Outlet list: ${preview.priceListName}.` : ""}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadPreview()} disabled={previewLoading}>
            <RefreshCw size={14} className={previewLoading ? "animate-spin mr-1" : "mr-1"} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {previewLoading && !preview ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading prices…</div>
          ) : previewItems.length === 0 ? (
            <div className="py-8 px-4 text-sm text-muted-foreground">
              No published retail prices yet. Set today&apos;s prices on the zone master
              {zoneMaster ? (
                <>
                  {" "}
                  <Link href={`/pricing/price-lists/${zoneMaster.id}`} className="text-primary underline">
                    {zoneMaster.name}
                  </Link>
                </>
              ) : (
                <>
                  {" "}
                  in{" "}
                  <Link href="/pricing/workspace/zones" className="text-primary underline">
                    Franchise zones
                  </Link>
                </>
              )}
              , then refresh.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Guide retail</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewItems.slice(0, 50).map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-mono text-xs">{row.sku ?? "—"}</TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>
                      {row.zoneBasePrice != null && row.zoneBasePrice > 0
                        ? formatMoney(row.zoneBasePrice, row.currency)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.commissionPerUnit > 0 ? formatMoney(row.commissionPerUnit, row.currency) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.retailPrice != null && row.retailPrice > 0
                        ? formatMoney(row.retailPrice, row.currency)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.eligible ? "secondary" : "outline"}>
                        {row.source ?? "—"}
                        {!row.eligible ? " · blocked" : ""}
                      </Badge>
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
