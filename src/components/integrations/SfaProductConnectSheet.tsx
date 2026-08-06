"use client";

import * as React from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchProductSfaSyncStatusApi,
  fetchSfaSyncSettingsApi,
  syncProductsToSfaApi,
  type ProductSfaSyncResult,
  type ProductSfaSyncStatusRow,
} from "@/lib/api/odaflow-integration";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import type { PriceList } from "@/lib/products/pricing-types";
import { formatMoney } from "@/lib/money";
import { buildPackPriceMatrix } from "@/lib/products/fmcg-pack-pricing";

type Catalog = "general_trade" | "modern_trade";

type Props = {
  productId: string;
  productName: string;
  barcode?: string;
  size?: string;
  piecePrice?: number | null;
  packaging?: Array<{ uom: string; unitsPer: number }>;
  orgDefaultPriceListId?: string | null;
  fmcgTagPrices?: Array<{ id: string; name: string; price: number; currency?: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
};

export function SfaProductConnectSheet({
  productId,
  productName,
  barcode,
  size,
  piecePrice,
  packaging,
  orgDefaultPriceListId,
  fmcgTagPrices,
  open,
  onOpenChange,
  onSynced,
}: Props) {
  const [step, setStep] = React.useState(0);
  const [gt, setGt] = React.useState(true);
  const [mt, setMt] = React.useState(false);
  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [priceListId, setPriceListId] = React.useState("");
  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState<ProductSfaSyncResult | null>(null);
  const [linkStatus, setLinkStatus] = React.useState<ProductSfaSyncStatusRow | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setResult(null);
    setPriceListId("");
    void fetchPriceListsForUi().then(setPriceLists).catch(() => setPriceLists([]));
    void fetchSfaSyncSettingsApi()
      .then((settings) => {
        setGt(settings.defaultCatalogs.includes("general_trade"));
        setMt(settings.defaultCatalogs.includes("modern_trade"));
        if (settings.defaultPriceListId) {
          setPriceListId(settings.defaultPriceListId);
        }
      })
      .catch(() => undefined);
    void fetchProductSfaSyncStatusApi([productId])
      .then((r) => setLinkStatus(r.items[0] ?? null))
      .catch(() => setLinkStatus(null));
  }, [open, productId]);

  React.useEffect(() => {
    if (!open || priceListId) return;
    const def = orgDefaultPriceListId || priceLists.find((p) => p.isDefault)?.id;
    if (def) setPriceListId(def);
    else if (priceLists[0]?.id) setPriceListId(priceLists[0].id);
  }, [open, orgDefaultPriceListId, priceLists, priceListId]);

  const catalogs: Catalog[] = [
    ...(gt ? (["general_trade"] as const) : []),
    ...(mt ? (["modern_trade"] as const) : []),
  ];

  const selectedTag = priceLists.find((p) => p.id === priceListId);
  const pieceFromTag =
    fmcgTagPrices?.find((t) => t.id === priceListId)?.price ?? piecePrice ?? null;
  const packPreview =
    pieceFromTag != null && Number.isFinite(pieceFromTag)
      ? buildPackPriceMatrix(pieceFromTag, packaging ?? [])
      : [];

  const handleSync = async () => {
    if (!catalogs.length) {
      toast.error("Select at least one SFA catalog.");
      return;
    }
    if (!priceListId) {
      toast.error("Choose a price tag.");
      return;
    }
    setSyncing(true);
    try {
      const res = await syncProductsToSfaApi({
        productIds: [productId],
        catalogs,
        priceListId,
      });
      setResult(res);
      if (res.skipped.length) {
        toast.warning(res.skipped[0]?.reason ?? "Product was skipped.");
      } else {
        toast.success("Connected to Odaflow SFA.");
        onSynced?.();
      }
      void fetchProductSfaSyncStatusApi([productId])
        .then((r) => setLinkStatus(r.items[0] ?? null))
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Connect to Odaflow SFA</SheetTitle>
          <SheetDescription>
            Mirror this product to sales reps&apos; catalog. Choose which price tag reps should see.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {["Catalogs", "Price tag", "Review"].map((label, i) => (
              <React.Fragment key={label}>
                <span className={step >= i ? "font-medium text-foreground" : ""}>
                  {i + 1}. {label}
                </span>
                {i < 2 ? <Icons.ChevronRight className="h-3 w-3" /> : null}
              </React.Fragment>
            ))}
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The same ERP product can appear in both General trade and Modern trade catalogs.
              </p>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox id="sfa-gt" checked={gt} onCheckedChange={(v) => setGt(v === true)} />
                <div>
                  <Label htmlFor="sfa-gt" className="font-medium">
                    General trade
                  </Label>
                  <p className="text-xs text-muted-foreground">Van, distributor, direct customers</p>
                  {linkStatus?.generalTrade.linked ? (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Already linked
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox id="sfa-mt" checked={mt} onCheckedChange={(v) => setMt(v === true)} />
                <div>
                  <Label htmlFor="sfa-mt" className="font-medium">
                    Modern trade
                  </Label>
                  <p className="text-xs text-muted-foreground">Supermarket / LPO catalog</p>
                  {linkStatus?.modernTrade.linked ? (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Already linked
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
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
              {pieceFromTag != null && selectedTag ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <p>
                    Piece price from <span className="font-medium">{selectedTag.name}</span>:{" "}
                    {formatMoney(
                      pieceFromTag,
                      fmcgTagPrices?.find((t) => t.id === priceListId)?.currency ?? "KES"
                    )}
                  </p>
                  {packPreview.filter((p) => p.unitsPer > 1).map((p) => (
                    <p key={p.uom} className="text-muted-foreground">
                      {p.uom}: {p.unitsPer} pcs → {formatMoney(p.unitPrice, "KES")}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3 space-y-2">
                <p className="font-medium">{productName}</p>
                <p className="text-muted-foreground font-mono text-xs">{barcode || "No barcode"}</p>
                {size ? <p className="text-muted-foreground">Size: {size}</p> : null}
                <p>
                  Catalogs:{" "}
                  {[gt && "General trade", mt && "Modern trade"].filter(Boolean).join(" · ") || "—"}
                </p>
                <p>Price tag: {selectedTag?.name ?? "—"}</p>
              </div>
              {syncing ? (
                <div className="space-y-2">
                  <Progress value={66} className="h-2" />
                  <p className="text-xs text-muted-foreground">Syncing to SFA…</p>
                </div>
              ) : null}
              {result ? (
                <div className="rounded-lg border p-3 space-y-1">
                  <p>
                    Created GT {result.created.gt}, MT {result.created.mt} · Updated GT {result.updated.gt}, MT{" "}
                    {result.updated.mt}
                  </p>
                  {result.skipped.map((s, i) => (
                    <p key={i} className="text-red-600 text-xs">
                      Skipped: {s.reason}
                    </p>
                  ))}
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-amber-600 text-xs">
                      {w.reason}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <SheetFooter className="mt-6 gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" disabled={syncing} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step < 2 ? (
            <Button
              type="button"
              disabled={step === 0 && !catalogs.length}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          ) : (
            <Button type="button" disabled={syncing || !catalogs.length || !priceListId} onClick={() => void handleSync()}>
              {syncing ? "Syncing…" : result ? "Sync again" : "Sync now"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type CardProps = {
  productId: string;
  productName: string;
  barcode?: string;
  size?: string;
  piecePrice?: number | null;
  packaging?: Array<{ uom: string; unitsPer: number }>;
  orgDefaultPriceListId?: string | null;
  fmcgTagPrices?: Array<{ id: string; name: string; price: number; currency?: string }>;
  canWrite?: boolean;
};

export function SfaProductConnectionCard({
  productId,
  productName,
  barcode,
  size,
  piecePrice,
  packaging,
  orgDefaultPriceListId,
  fmcgTagPrices,
  canWrite,
}: CardProps) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<ProductSfaSyncStatusRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    setLoading(true);
    void fetchProductSfaSyncStatusApi([productId])
      .then((r) => setStatus(r.items[0] ?? null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [productId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const gtLinked = status?.generalTrade.linked;
  const mtLinked = status?.modernTrade.linked;
  const anyLinked = gtLinked || mtLinked;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Icons.Radio className="h-4 w-4 text-primary" />
            Odaflow SFA
          </CardTitle>
          <CardDescription>
            Connect this product so field reps can see it in the SFA catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Checking connection…</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={gtLinked ? "default" : "outline"}>
                  GT {gtLinked ? "connected" : "not connected"}
                </Badge>
                <Badge variant={mtLinked ? "default" : "outline"}>
                  MT {mtLinked ? "connected" : "not connected"}
                </Badge>
              </div>
              {!anyLinked ? (
                <p className="text-muted-foreground">
                  This product isn&apos;t on sales reps&apos; catalog yet.
                </p>
              ) : null}
              {canWrite ? (
                <Button type="button" size="sm" onClick={() => setOpen(true)} disabled={!barcode?.trim()}>
                  {anyLinked ? "Update in SFA" : "Connect to SFA"}
                </Button>
              ) : null}
              {!barcode?.trim() ? (
                <p className="text-xs text-amber-600">Add a barcode before connecting to SFA.</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <SfaProductConnectSheet
        productId={productId}
        productName={productName}
        barcode={barcode}
        size={size}
        piecePrice={piecePrice}
        packaging={packaging}
        orgDefaultPriceListId={orgDefaultPriceListId}
        fmcgTagPrices={fmcgTagPrices}
        open={open}
        onOpenChange={setOpen}
        onSynced={refresh}
      />
    </>
  );
}
