"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  type DailyPriceItem,
  type DailyPriceListResponse,
} from "@/lib/api/pricing";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

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
    setSaving(true);
    try {
      await bulkSetDailyPricesApi(priceListId, toSave, selectedDate);
      toast.success(`${toSave.length} price${toSave.length > 1 ? "s" : ""} saved for ${selectedDate}.`);
      await load();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save prices");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRow = async (item: DailyPriceItem) => {
    const val = edits[item.productId];
    if (val === undefined || val.trim() === "" || isNaN(Number(val))) {
      toast.error("Enter a valid price.");
      return;
    }
    setSaving(true);
    try {
      await bulkSetDailyPricesApi(priceListId, [{ productId: item.productId, price: Number(val) }], selectedDate);
      toast.success(`${item.name}: price saved.`);
      await load();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const staleCount = data?.staleCount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const isToday = selectedDate === today;

  return (
    <TooltipProvider>
      <PageShell>
        <PageHeader
          title={data ? `${data.priceListName} — Daily Prices` : "Price list"}
          description={`Set today's selling price per product. Prices are reviewed daily — stale prices use the previous day's rate as fallback.`}
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
          {/* Status bar */}
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
                    <strong>{staleCount} of {totalCount} product{totalCount !== 1 ? "s" : ""}</strong> {isToday ? "haven't been priced today" : `have no price for ${selectedDate}`} — showing previous day's fallback price.
                  </span>
                  {isToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={() => {
                        // Fill stale rows with their fallback price
                        const fills: Record<string, string> = {};
                        for (const item of data.items) {
                          if (item.isStale && item.fallbackPrice != null) {
                            fills[item.productId] = String(item.fallbackPrice);
                          }
                        }
                        if (Object.keys(fills).length === 0) return;
                        setEdits((prev) => ({ ...prev, ...fills }));
                        setDirty((prev) => {
                          const next = new Set(prev);
                          Object.keys(fills).forEach((id) => next.add(id));
                          return next;
                        });
                        toast.info("Filled stale rows with yesterday's prices. Review and save.");
                      }}
                    >
                      Fill from yesterday
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
                    {data?.currency} · Enter price per kg. Stale rows (amber) use previous day's price as fallback.
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
                  No sellable products found. Add products with type "Finished" or "Both" to see them here.
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
                      <TableHead className="w-40">Previous price</TableHead>
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
                                placeholder={item.fallbackPrice != null ? String(item.fallbackPrice) : "Enter price"}
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
                            {item.fallbackPrice != null ? (
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
                              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-xs gap-1 whitespace-nowrap">
                                <Icons.Clock className="h-3 w-3" />
                                Stale
                              </Badge>
                            ) : isDirtyRow ? (
                              <Badge variant="outline" className="text-sky-600 border-sky-300 text-xs gap-1">
                                <Icons.Pencil className="h-3 w-3" />
                                Edited
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
                                <Icons.CheckCircle2 className="h-3 w-3" />
                                Set
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
    </TooltipProvider>
  );
}
