"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchDailyPricesApi,
  bulkSetDailyPricesApi,
  previewZonePriceCascadeApi,
  applyZonePriceCascadeApi,
  syncFranchisePublisherToOutletsApi,
  type DailyPriceItem,
  type DailyPriceListResponse,
  type ZonePriceCascadeConflict,
} from "@/lib/api/pricing";
import {
  fetchEngineItems,
  postGenerateEngineSuggestions,
  postPublishEngineItem,
  fetchCostBreakdown,
} from "@/lib/api/pricing-engine";
import type { PriceListEngineItemDto } from "@/lib/pricing/engine-types";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { FranchiseOutletsPanel } from "@/components/pricing/franchise-outlets-panel";
import { ZonePriceCascadeDialog } from "@/components/pricing/zone-price-cascade-dialog";
import { isFranchiseList } from "@/lib/pricing/franchise-zone-master";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtCcy(n: number | null | undefined, currency: string): string {
  if (n == null) return "—";
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
}

function PricingEnginePanel({ priceListId, currency }: { priceListId: string; currency: string }) {
  const [items, setItems] = React.useState<PriceListEngineItemDto[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [approvePrice, setApprovePrice] = React.useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = React.useState<Record<string, string>>({});
  const [bdOpen, setBdOpen] = React.useState(false);
  const [bdJson, setBdJson] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      const list = await fetchEngineItems(priceListId);
      setItems(list);
      const map: Record<string, string> = {};
      list.forEach((it) => {
        map[it.id] = it.suggestedPrice != null ? String(Math.round(it.suggestedPrice * 100) / 100) : "";
      });
      setApprovePrice(map);
    } catch {
      setItems([]);
    }
  }, [priceListId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleGenerate = async () => {
    if (!isApiConfigured()) {
      toast.info("Configure API URL first.");
      return;
    }
    setBusy(true);
    try {
      const r = await postGenerateEngineSuggestions(priceListId);
      toast.success(`Engine refreshed (${r.updated} rows).`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openBreakdown = async (itemId: string) => {
    if (!isApiConfigured()) return;
    try {
      const b = await fetchCostBreakdown(itemId);
      setBdJson(JSON.stringify(b, null, 2));
      setBdOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handlePublish = async (it: PriceListEngineItemDto) => {
    const raw = approvePrice[it.id];
    const approved = Number(raw);
    if (!Number.isFinite(approved) || approved < 0) {
      toast.error("Enter a valid approved price.");
      return;
    }
    const sug = it.suggestedPrice;
    let reason: string | undefined = overrideReason[it.id]?.trim();
    if (sug != null && Math.abs(approved - sug) > 1e-4) {
      if (!reason) {
        toast.error("Override reason is required when price differs from suggested.");
        return;
      }
    } else {
      reason = undefined;
    }
    setBusy(true);
    try {
      await postPublishEngineItem(it.id, {
        approvedPrice: approved,
        suggestedPrice: sug ?? undefined,
        overrideReason: reason,
      });
      toast.success("Published to daily price.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Icons.Calculator className="h-4 w-4" /> Smart pricing engine
              </CardTitle>
              <CardDescription>
                Suggested prices from batch cost + markup rules. Publishing updates today&apos;s daily price row.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/pricing/daily-review">Approval queue</Link>
              </Button>
              <Button size="sm" disabled={busy} onClick={() => void handleGenerate()}>
                {busy ? (
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Icons.Sparkles className="h-4 w-4 mr-1" /> Generate suggestions
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No engine rows yet — persist batch costs (GRN recalculate), then generate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[100px]">Product</TableHead>
                  <TableHead>Suggested</TableHead>
                  <TableHead>Cost/kg</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-52">Publish</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-[10px] break-all">{it.productId}</TableCell>
                    <TableCell className="tabular-nums">{fmtCcy(it.suggestedPrice, currency)}</TableCell>
                    <TableCell className="tabular-nums">{fmtCcy(it.finalCostPerKg, currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{it.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          className="h-8 tabular-nums text-sm"
                          min="0"
                          step="1"
                          value={approvePrice[it.id] ?? ""}
                          onChange={(e) => setApprovePrice((p) => ({ ...p, [it.id]: e.target.value }))}
                        />
                        <Input
                          placeholder="Override reason (if ≠ suggested)"
                          className="h-7 text-xs"
                          value={overrideReason[it.id] ?? ""}
                          onChange={(e) => setOverrideReason((p) => ({ ...p, [it.id]: e.target.value }))}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled={busy}
                        onClick={() => void handlePublish(it)}
                      >
                        Publish
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-7"
                        type="button"
                        onClick={() => void openBreakdown(it.id)}
                      >
                        Breakdown
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={bdOpen} onOpenChange={(o) => !o && setBdOpen(false)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cost breakdown</SheetTitle>
            <SheetDescription>Batch + delivery allocations snapshot</SheetDescription>
          </SheetHeader>
          <pre className="mt-4 text-[10px] leading-relaxed whitespace-pre-wrap">{bdJson}</pre>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function PriceListViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const priceListId = params.id;
  const today = todayIso();

  const [data, setData] = React.useState<DailyPriceListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  // Local edits: productId → price string
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  // Track which rows have unsaved changes
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [cascadeOpen, setCascadeOpen] = React.useState(false);
  const [cascadeConflicts, setCascadeConflicts] = React.useState<ZonePriceCascadeConflict[]>([]);
  const [cascadeApplying, setCascadeApplying] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDailyPricesApi(priceListId, selectedDate);
      setData(res);
      // Pre-populate edits with today's prices (or effective fallback)
      const initial: Record<string, string> = {};
      for (const item of res.items) {
        if (item.todayPrice != null) initial[item.productId] = String(item.todayPrice);
      }
      setEdits(initial);
      setDirty(new Set());
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, [priceListId, selectedDate]);

  React.useEffect(() => { void load(); }, [load]);

  const handleChange = (productId: string, value: string) => {
    setEdits((prev) => ({ ...prev, [productId]: value }));
    setDirty((prev) => new Set(prev).add(productId));
  };

  const saveDailyPrices = async (
    toSave: Array<{ productId: string; price: number }>,
    successMessage: string
  ) => {
    if (!data) return;
    setSaving(true);
    try {
      const isFranchisePublisher =
        isFranchiseList({ channel: data.channel ?? undefined }) && !data.franchiseId;
      let conflicts: ZonePriceCascadeConflict[] = [];

      if (isFranchisePublisher) {
        const preview = await previewZonePriceCascadeApi(priceListId, toSave, selectedDate);
        conflicts = preview.conflicts;
      }

      await bulkSetDailyPricesApi(priceListId, toSave, selectedDate);
      toast.success(successMessage);

      if (conflicts.length > 0) {
        setCascadeConflicts(conflicts);
        setCascadeOpen(true);
      }

      await load();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save prices");
    } finally {
      setSaving(false);
    }
  };

  const handleCascadeApply = async (selected: ZonePriceCascadeConflict[]) => {
    setCascadeApplying(true);
    try {
      const apply = selected.map((c) => ({
        outletListId: c.outletListId,
        productId: c.productId,
      }));
      const result = await applyZonePriceCascadeApi(priceListId, apply, selectedDate);
      toast.success(
        `Removed ${result.removed} outlet override${result.removed !== 1 ? "s" : ""} — outlets now use the zone price.`
      );
      setCascadeOpen(false);
      setCascadeConflicts([]);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to apply zone prices to outlets");
    } finally {
      setCascadeApplying(false);
    }
  };

  const handleKeepAllCustom = () => {
    setCascadeOpen(false);
    setCascadeConflicts([]);
  };

  const handleSaveAll = async () => {
    if (!data) return;
    const toSave = data.items
      .filter((item) => {
        const val = edits[item.productId];
        return val !== undefined && val.trim() !== "" && !isNaN(Number(val));
      })
      .map((item) => ({
        productId: item.productId,
        price: Number(edits[item.productId]),
      }));

    if (toSave.length === 0) {
      toast.info("No prices to save — enter at least one price.");
      return;
    }
    await saveDailyPrices(
      toSave,
      `${toSave.length} price${toSave.length > 1 ? "s" : ""} saved for ${selectedDate}.`
    );
  };

  const handleSaveRow = async (item: DailyPriceItem) => {
    const val = edits[item.productId];
    if (val === undefined || val.trim() === "" || isNaN(Number(val))) {
      toast.error("Enter a valid price.");
      return;
    }
    await saveDailyPrices(
      [{ productId: item.productId, price: Number(val) }],
      `${item.name}: price saved.`
    );
  };

  const staleCount = data?.staleCount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const isToday = selectedDate === today;
  const hasParentList = Boolean(data?.parentPriceListId);
  const isFranchisePublisher =
    isFranchiseList({ channel: data?.channel ?? undefined }) && !data?.franchiseId;
  const isOutletDerivedList = Boolean(data?.franchiseId);

  const handleApplyToOutlets = async () => {
    if (!data) return;
    const toSync = data.items
      .filter((item) => item.isStale)
      .map((item) => {
        const val = item.inheritedPrice ?? item.fallbackPrice;
        return val != null ? { productId: item.productId, price: val } : null;
      })
      .filter(Boolean) as Array<{ productId: string; price: number }>;

    if (toSync.length === 0) {
      toast.info("No zone prices available to apply — set prices or ensure a parent list has today's rates.");
      return;
    }

    setSaving(true);
    try {
      const result = await syncFranchisePublisherToOutletsApi(priceListId, toSync, selectedDate);
      toast.success(
        `Published ${result.zoneUpdated} zone price${result.zoneUpdated !== 1 ? "s" : ""}` +
          (result.outletOverridesRemoved > 0
            ? ` and cleared ${result.outletOverridesRemoved} outlet override${result.outletOverridesRemoved !== 1 ? "s" : ""}.`
            : ". Linked outlets will inherit these prices.")
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to apply zone prices to outlets");
    } finally {
      setSaving(false);
    }
  };

  const inheritedHint = (item: DailyPriceItem) =>
    item.inheritedPrice != null ? String(item.inheritedPrice) : item.fallbackPrice != null ? String(item.fallbackPrice) : "Enter price";

  return (
    <TooltipProvider>
      <PageShell>
        <PageHeader
          title={data ? `${data.priceListName} — Daily Prices` : "Price list"}
          description={
            isOutletDerivedList
              ? `Override prices for this outlet only. Zone base prices inherit from ${data?.parentPriceListName ?? "the parent list"} — shown below when you have not set an outlet override.`
              : isFranchisePublisher
                ? "Publish today's zone base prices for all active sellable products in your catalog. Deleting or deactivating a product in master removes it from this list. Linked outlets inherit these unless they have an outlet-specific override."
                : `Set today's selling price per active sellable product in your catalog. Deleting or deactivating a product in master removes it from this list. Stale prices use the previous day's rate as fallback.`
          }
          breadcrumbs={[
            { label: "Pricing", href: "/pricing/overview" },
            { label: "Price lists", href: "/pricing/price-lists" },
            { label: data?.priceListName ?? "View" },
          ]}
          sticky
          actions={
            <div className="flex items-center gap-2">
              {/* Date picker */}
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value || today)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" size="sm" onClick={() => router.push("/pricing/price-lists")}>
                <Icons.ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
              <Button size="sm" disabled={saving || dirty.size === 0 || !isToday} onClick={handleSaveAll}>
                {saving ? (
                  <><Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><Icons.Save className="mr-2 h-4 w-4" />Save all prices</>
                )}
              </Button>
            </div>
          }
        />

        <div className="p-6 space-y-4">
          <FranchiseOutletsPanel priceListId={priceListId} />
          {data && isApiConfigured() && (
            <PricingEnginePanel priceListId={priceListId} currency={data.currency} />
          )}
          {/* Status bar */}
          {data && isOutletDerivedList && (
            <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm dark:border-sky-900/40 dark:bg-sky-950/30">
              <Icons.Link2 className="h-4 w-4 text-sky-600 shrink-0" />
              <span className="text-sky-900 dark:text-sky-200">
                Linked to{" "}
                {data.parentPriceListId ? (
                  <Link href={`/pricing/price-lists/${data.parentPriceListId}`} className="underline font-medium">
                    {data.parentPriceListName ?? "zone master"}
                  </Link>
                ) : (
                  "zone master"
                )}
                . Empty fields show the zone price — enter a value only to override this outlet.
              </span>
            </div>
          )}
          {data && isFranchisePublisher && hasParentList && (
            <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm dark:border-sky-900/40 dark:bg-sky-950/30">
              <Icons.Link2 className="h-4 w-4 text-sky-600 shrink-0" />
              <span className="text-sky-900 dark:text-sky-200">
                Base prices can inherit from{" "}
                {data.parentPriceListId ? (
                  <Link href={`/pricing/price-lists/${data.parentPriceListId}`} className="underline font-medium">
                    {data.parentPriceListName ?? "parent list"}
                  </Link>
                ) : (
                  "parent list"
                )}
                . Publish here to set this zone&apos;s prices — linked outlets follow unless overridden.
              </span>
            </div>
          )}
          {data && (
            <div className={cn(
              "flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm",
              staleCount > 0
                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            )}>
              {staleCount > 0 ? (
                <>
                  <Icons.AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300">
                    <strong>{staleCount} of {totalCount} product{totalCount !== 1 ? "s" : ""}</strong>{" "}
                    {isFranchisePublisher
                      ? isToday
                        ? "need today's zone base price published"
                        : `have no zone price for ${selectedDate}`
                      : isOutletDerivedList
                        ? isToday
                          ? "have no outlet override for today"
                          : `have no outlet price for ${selectedDate}`
                        : isToday
                          ? "still need a price for today"
                          : `have no price for ${selectedDate}`}
                    {isFranchisePublisher
                      ? hasParentList
                        ? " — parent prices shown as placeholders."
                        : " — previous day\u2019s prices shown as fallback."
                      : isOutletDerivedList
                        ? " — zone prices shown as placeholders."
                        : " — showing previous day\u2019s fallback price."}
                  </span>
                  {isToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
                      disabled={saving}
                      onClick={() => {
                        if (isFranchisePublisher) {
                          void handleApplyToOutlets();
                          return;
                        }
                        const fills: Record<string, string> = {};
                        for (const item of data.items) {
                          if (item.isStale) {
                            const val = item.inheritedPrice ?? item.fallbackPrice;
                            if (val != null) fills[item.productId] = String(val);
                          }
                        }
                        if (Object.keys(fills).length === 0) return;
                        setEdits((prev) => ({ ...prev, ...fills }));
                        setDirty((prev) => {
                          const next = new Set(prev);
                          Object.keys(fills).forEach((id) => next.add(id));
                          return next;
                        });
                        toast.info(
                          isOutletDerivedList
                            ? "Filled with zone prices. Save only if you want explicit overrides on this list."
                            : "Filled stale rows with yesterday's prices. Review and save."
                        );
                      }}
                    >
                      {isFranchisePublisher
                        ? "Apply to outlets"
                        : isOutletDerivedList
                          ? "Fill from zone"
                          : "Fill from yesterday"}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Icons.CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 dark:text-emerald-300">
                    All <strong>{totalCount}</strong> product{totalCount !== 1 ? "s" : ""} have been priced for {isToday ? "today" : selectedDate}.
                  </span>
                </>
              )}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {data?.priceListName} · {selectedDate}
                    {isToday && <Badge variant="secondary" className="ml-2 text-xs">Today</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {isOutletDerivedList
                      ? `${data?.currency} · Zone price shown in empty fields. Save only when overriding this outlet.`
                      : isFranchisePublisher
                        ? `${data?.currency} · Publish zone base prices for today. Saving pushes updates to linked outlets when they have custom overrides.`
                        : `${data?.currency} · Enter price per kg. Stale rows (amber) use previous day\u2019s price as fallback.`}
                  </CardDescription>
                </div>
                {staleCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 gap-1">
                    <Icons.Clock className="h-3 w-3" />
                    {staleCount} need update
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />Loading prices…
                </div>
              ) : !data || data.items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No sellable products found. Add products with type &quot;Finished&quot; or &quot;Both&quot; to see them here.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24">UOM</TableHead>
                      <TableHead className="w-44">
                        {isToday ? "Today's price" : `Price (${selectedDate})`}
                      </TableHead>
                      <TableHead className="w-40">
                        {isOutletDerivedList ? "Zone / previous" : "Previous price"}
                      </TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      {isToday && <TableHead className="w-20"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => {
                      const editVal = edits[item.productId];
                      const isDirtyRow = dirty.has(item.productId);
                      return (
                        <TableRow
                          key={item.productId}
                          className={cn(
                            item.isStale && !isDirtyRow && "bg-amber-50/40 dark:bg-amber-950/10"
                          )}
                        >
                          <TableCell className="font-mono text-xs font-medium">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{item.uom}</TableCell>
                          <TableCell>
                            {isToday ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder={inheritedHint(item)}
                                value={editVal ?? ""}
                                onChange={(e) => handleChange(item.productId, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void handleSaveRow(item);
                                }}
                                className={cn(
                                  "h-8 w-36 tabular-nums",
                                  isDirtyRow && "border-primary ring-1 ring-primary/30"
                                )}
                              />
                            ) : (
                              <span className="tabular-nums text-sm">
                                {item.todayPrice != null ? fmtCcy(item.todayPrice, item.currency) : <span className="text-muted-foreground">—</span>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.inheritedPrice != null ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default tabular-nums">
                                    {fmtCcy(item.inheritedPrice, item.currency)}
                                    <span className="ml-1 text-xs opacity-60">
                                      ({item.inheritedFromListName ?? "zone"}
                                      {item.inheritedDate && !item.inheritedFromTargetDate
                                        ? ` · ${fmtDate(item.inheritedDate)}`
                                        : item.inheritedFromTargetDate
                                          ? " · today"
                                          : ""}
                                      )
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Inherited from {item.inheritedFromListName ?? "parent list"}
                                  {item.inheritedDate ? ` (${item.inheritedDate})` : ""}
                                </TooltipContent>
                              </Tooltip>
                            ) : item.fallbackPrice != null ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default tabular-nums">
                                    {fmtCcy(item.fallbackPrice, item.currency)}
                                    <span className="ml-1 text-xs opacity-60">({fmtDate(item.fallbackDate)})</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Last set on {item.fallbackDate}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">No history</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.isStale && !isDirtyRow ? (
                              item.inheritedPrice != null ? (
                                <Badge variant="outline" className="text-sky-600 border-sky-300 bg-sky-50/60 dark:bg-sky-950/20 text-xs gap-1 whitespace-nowrap">
                                  <Icons.Link2 className="h-3 w-3" />
                                  {isOutletDerivedList ? "Zone price" : "From parent"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-xs gap-1 whitespace-nowrap">
                                  <Icons.Clock className="h-3 w-3" />
                                  Stale
                                </Badge>
                              )
                            ) : isDirtyRow ? (
                              <Badge variant="outline" className="text-sky-600 border-sky-300 text-xs gap-1">
                                <Icons.Pencil className="h-3 w-3" />
                                Edited
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
                                <Icons.CheckCircle2 className="h-3 w-3" />
                                {isFranchisePublisher ? "Published" : "Set"}
                              </Badge>
                            )}
                          </TableCell>
                          {isToday && (
                            <TableCell>
                              {isDirtyRow && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  disabled={saving}
                                  onClick={() => void handleSaveRow(item)}
                                >
                                  Save
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {isToday && dirty.size > 0 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEdits({}); setDirty(new Set()); }}>
                Discard changes
              </Button>
              <Button size="sm" disabled={saving} onClick={handleSaveAll}>
                {saving ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Save className="mr-2 h-4 w-4" />}
                Save {dirty.size} price{dirty.size !== 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </div>
      </PageShell>

      {data && (
        <ZonePriceCascadeDialog
          open={cascadeOpen}
          onOpenChange={(open) => {
            if (!open) handleKeepAllCustom();
            else setCascadeOpen(true);
          }}
          conflicts={cascadeConflicts}
          currency={data.currency}
          applying={cascadeApplying}
          onApplySelected={handleCascadeApply}
          onKeepAll={handleKeepAllCustom}
        />
      )}
    </TooltipProvider>
  );
}
