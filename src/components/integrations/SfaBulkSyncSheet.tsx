"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchSfaSyncSettingsApi,
  syncProductsToSfaBatchedApi,
  type ProductSfaSyncResult,
  type SfaBulkSyncProgress,
} from "@/lib/api/odaflow-integration";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import type { PriceList } from "@/lib/products/pricing-types";

type Catalog = "general_trade" | "modern_trade";

type Props = {
  productIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
  title?: string;
};

export function SfaBulkSyncSheet({
  productIds,
  open,
  onOpenChange,
  onSynced,
  title = "Sync products to Odaflow SFA",
}: Props) {
  const [gt, setGt] = React.useState(true);
  const [mt, setMt] = React.useState(false);
  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [priceListId, setPriceListId] = React.useState("");
  const [syncing, setSyncing] = React.useState(false);
  const [progress, setProgress] = React.useState<SfaBulkSyncProgress | null>(null);
  const [result, setResult] = React.useState<ProductSfaSyncResult | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setResult(null);
    setProgress(null);
    void Promise.all([fetchPriceListsForUi(), fetchSfaSyncSettingsApi()])
      .then(([lists, settings]) => {
        setPriceLists(lists);
        setGt(settings.defaultCatalogs.includes("general_trade"));
        setMt(settings.defaultCatalogs.includes("modern_trade"));
        const def =
          settings.defaultPriceListId ||
          lists.find((p) => p.isDefault)?.id ||
          lists[0]?.id ||
          "";
        setPriceListId(def);
      })
      .catch(() => {
        setPriceLists([]);
      });
  }, [open]);

  const catalogs: Catalog[] = [
    ...(gt ? (["general_trade"] as const) : []),
    ...(mt ? (["modern_trade"] as const) : []),
  ];

  const selectedTag = priceLists.find((p) => p.id === priceListId);
  const progressPercent =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const handleSync = async () => {
    if (!catalogs.length) {
      toast.error("Select at least one SFA catalog.");
      return;
    }
    if (!priceListId) {
      toast.error("Choose a price tag.");
      return;
    }
    if (!productIds.length) {
      toast.error("No products selected.");
      return;
    }

    setSyncing(true);
    setResult(null);
    try {
      const res = await syncProductsToSfaBatchedApi(
        { productIds, catalogs, priceListId },
        setProgress
      );
      setResult(res);
      const synced =
        res.created.gt + res.created.mt + res.updated.gt + res.updated.mt;
      if (synced > 0 && res.skipped.length === 0) {
        toast.success(`Synced ${synced} catalog link${synced === 1 ? "" : "s"} to SFA.`);
      } else if (synced > 0) {
        toast.warning(`Synced ${synced}; ${res.skipped.length} skipped.`);
      } else {
        toast.error(res.skipped[0]?.reason ?? "No products were synced.");
      }
      if (synced > 0) onSynced?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Mirror {productIds.length} product{productIds.length === 1 ? "" : "s"} to sales reps&apos;
            catalog using one price tag for display prices.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-medium">SFA catalogs</Label>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox id="bulk-sfa-gt" checked={gt} onCheckedChange={(v) => setGt(v === true)} />
              <div>
                <Label htmlFor="bulk-sfa-gt" className="font-medium">
                  General trade
                </Label>
                <p className="text-xs text-muted-foreground">Van, distributor, direct customers</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox id="bulk-sfa-mt" checked={mt} onCheckedChange={(v) => setMt(v === true)} />
              <div>
                <Label htmlFor="bulk-sfa-mt" className="font-medium">
                  Modern trade
                </Label>
                <p className="text-xs text-muted-foreground">Supermarket / LPO catalog</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Price tag to show in SFA</Label>
            <Select value={priceListId || "__none__"} onValueChange={(v) => setPriceListId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select price tag" />
              </SelectTrigger>
              <SelectContent>
                {priceLists.map((pl) => (
                  <SelectItem key={pl.id} value={pl.id}>
                    {pl.name}
                    {pl.isDefault ? " (org default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Customer orders may still use each customer&apos;s own price tag when billed in ERP.
            </p>
          </div>

          {syncing && progress ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Syncing {progress.done} of {progress.total}…
                </span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          ) : null}

          {result ? (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <p className="font-medium">Sync report</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Created GT {result.created.gt}</Badge>
                <Badge variant="secondary">Created MT {result.created.mt}</Badge>
                <Badge variant="outline">Updated GT {result.updated.gt}</Badge>
                <Badge variant="outline">Updated MT {result.updated.mt}</Badge>
                {result.skipped.length ? (
                  <Badge variant="destructive">Skipped {result.skipped.length}</Badge>
                ) : null}
              </div>
              {result.skipped.length ? (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.skipped.slice(0, 20).map((s, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {s.barcode ? `${s.barcode}: ` : ""}
                      {s.reason}
                    </p>
                  ))}
                  {result.skipped.length > 20 ? (
                    <p className="text-xs text-muted-foreground">
                      …and {result.skipped.length - 20} more
                    </p>
                  ) : null}
                </div>
              ) : null}
              {selectedTag ? (
                <p className="text-xs text-muted-foreground">
                  Prices from <span className="font-medium">{selectedTag.name}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button type="button" variant="outline" disabled={syncing} onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button type="button" disabled={syncing || !catalogs.length || !priceListId} onClick={() => void handleSync()}>
            {syncing ? "Syncing…" : result ? "Sync again" : `Sync ${productIds.length} products`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function SfaBulkSyncLink({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  if (count <= 0) return null;
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Icons.Radio className="mr-2 h-4 w-4" />
      Sync {count} to SFA
    </Button>
  );
}

export function SfaUnlinkedProductLink({ productId, name }: { productId: string; name: string }) {
  return (
    <Link href={`/master/products/${productId}`} className="text-primary hover:underline">
      {name}
    </Link>
  );
}
