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
import { OutletPriceListAssignment } from "@/components/franchise/outlet-price-list-assignment";
import { FranchiseProductEconomicsSection } from "@/components/franchise/franchise-product-economics-section";
import { assignOutletPricingZone, fetchOutletRetailPricePreview } from "@/lib/api/franchise-pricing";
import { fetchPricingZones } from "@/lib/api/pricing-engine";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function OutletPricingTab({
  outletOrgId,
  assignedPriceListId,
  franchiseeRegistryId,
  onAssigned,
}: {
  outletOrgId: string;
  assignedPriceListId?: string | null;
  franchiseeRegistryId?: string | null;
  onAssigned?: () => void;
}) {
  const [zones, setZones] = React.useState<Awaited<ReturnType<typeof fetchPricingZones>>>([]);
  const [zoneId, setZoneId] = React.useState("");
  const [savingZone, setSavingZone] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<Awaited<ReturnType<typeof fetchOutletRetailPricePreview>> | null>(
    null
  );

  React.useEffect(() => {
    fetchPricingZones()
      .then(setZones)
      .catch(() => {});
  }, []);

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

  const previewItems = (preview?.items ?? []).filter((i) => i.retailPrice != null && i.retailPrice > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing zone</CardTitle>
          <CardDescription>
            Zone presets apply to all franchises in the zone. Per-outlet overrides live on the
            derived outlet price list.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
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
        </CardContent>
      </Card>

      <OutletPriceListAssignment
        outletOrgId={outletOrgId}
        assignedPriceListId={assignedPriceListId}
        onAssigned={() => {
          onAssigned?.();
          void loadPreview();
        }}
      />

      <FranchiseProductEconomicsSection
        franchiseeRegistryId={franchiseeRegistryId}
        outletOrgId={outletOrgId}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Published retail preview</CardTitle>
            <CardDescription>
              Prices WhatsApp and Coolcatch bot will show (daily publish → engine → list chain).
              {preview?.priceListName ? ` List: ${preview.priceListName}.` : ""}
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
              No published retail prices yet. Publish daily prices on the assigned list in{" "}
              <Link href="/pricing/workspace/lists" className="text-primary underline">
                Pricing workspace
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Retail</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewItems.slice(0, 50).map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-mono text-xs">{row.sku ?? "—"}</TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{formatMoney(row.retailPrice ?? 0, row.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.source ?? "—"}</Badge>
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
