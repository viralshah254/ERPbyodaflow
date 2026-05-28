"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { CommissionDefaultRow } from "@/lib/api/franchise-commission-defaults";

const PAGE_SIZE = 50;

type Row = {
  productId: string;
  sku: string;
  name: string;
  orgDefault: string;
  commission: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setD(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return d;
}

export function CommissionDefaultsEditor(props: {
  mode: "org" | "zone";
  zoneId?: string;
  fetchDefaults: (params: {
    productIds?: string[];
    limit?: number;
    cursor?: string;
    includeProductDetails?: boolean;
    search?: string;
  }) => Promise<{ items: CommissionDefaultRow[]; nextCursor: string | null }>;
  saveDefaults: (items: Array<{ productId: string; commissionPerUnit: number }>) => Promise<void>;
}) {
  const { mode, fetchDefaults, saveDefaults } = props;
  const [tab, setTab] = React.useState<"catalog" | "assigned">("catalog");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [listRefreshTick, setListRefreshTick] = React.useState(0);

  const [catalogSearch, setCatalogSearch] = React.useState("");
  const catalogSearchDebounced = useDebounced(catalogSearch, 400);
  const [catalogOnlyDefaults, setCatalogOnlyDefaults] = React.useState(false);
  const [assignedSearch, setAssignedSearch] = React.useState("");
  const assignedSearchDebounced = useDebounced(assignedSearch, 400);
  const [catalogCursor, setCatalogCursor] = React.useState("0");
  const [catalogCursorStack, setCatalogCursorStack] = React.useState<string[]>([]);
  const [catalogNextCursor, setCatalogNextCursor] = React.useState<string | null>(null);
  const [assignedCursor, setAssignedCursor] = React.useState("0");
  const [assignedCursorStack, setAssignedCursorStack] = React.useState<string[]>([]);
  const [assignedNextCursor, setAssignedNextCursor] = React.useState<string | null>(null);

  const [savedByProductId, setSavedByProductId] = React.useState<Map<string, { commission: string }>>(
    () => new Map()
  );

  const snapshotRows = React.useCallback((list: Row[]) => {
    const m = new Map<string, { commission: string }>();
    for (const r of list) m.set(r.productId, { commission: r.commission });
    return m;
  }, []);

  const isDirty = React.useMemo(() => {
    for (const r of rows) {
      const saved = savedByProductId.get(r.productId);
      if (!saved) {
        if (r.commission.trim() !== "") return true;
        continue;
      }
      if (saved.commission !== r.commission) return true;
    }
    return false;
  }, [rows, savedByProductId]);

  React.useEffect(() => {
    setCatalogCursor("0");
    setCatalogCursorStack([]);
    setCatalogSearch("");
    setCatalogOnlyDefaults(false);
    setAssignedSearch("");
    setAssignedCursor("0");
    setAssignedCursorStack([]);
    setSavedByProductId(new Map());
  }, [props.zoneId, mode]);

  React.useEffect(() => {
    setCatalogCursor("0");
    setCatalogCursorStack([]);
  }, [catalogSearchDebounced]);

  React.useEffect(() => {
    setAssignedCursor("0");
    setAssignedCursorStack([]);
  }, [assignedSearchDebounced]);

  React.useEffect(() => {
    if (tab !== "catalog") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const products = await fetchProductsPageApi({
          limit: PAGE_SIZE,
          cursor: catalogCursor,
          sellable: true,
          includeStock: false,
          search: catalogSearchDebounced.trim() || undefined,
        });
        if (cancelled) return;
        const ids = products.items.map((p) => p.id);
        const defaults = ids.length
          ? await fetchDefaults({ productIds: ids, includeProductDetails: true })
          : { items: [], nextCursor: null as string | null };
        if (cancelled) return;
        const defaultMap = new Map(defaults.items.map((e) => [e.productId, e]));
        const mapped = products.items.map((p) => {
          const e = defaultMap.get(p.id);
          return {
            productId: p.id,
            sku: p.sku ?? p.id,
            name: p.name,
            orgDefault:
              mode === "zone" && e?.orgDefaultCommission != null ? String(e.orgDefaultCommission) : "",
            commission: e != null && e.commissionPerUnit > 0 ? String(e.commissionPerUnit) : "",
          };
        });
        setRows(mapped);
        setSavedByProductId(snapshotRows(mapped));
        setCatalogNextCursor(products.nextCursor ?? null);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, catalogCursor, catalogSearchDebounced, listRefreshTick, fetchDefaults, mode, snapshotRows]);

  React.useEffect(() => {
    if (tab !== "assigned") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { items, nextCursor } = await fetchDefaults({
          limit: PAGE_SIZE,
          cursor: assignedCursor,
          includeProductDetails: true,
          search: assignedSearchDebounced.trim() || undefined,
        });
        if (cancelled) return;
        const mapped = items.map((e) => ({
          productId: e.productId,
          sku: e.sku ?? e.productId,
          name: e.productName ?? e.productId,
          orgDefault:
            mode === "zone" && e.orgDefaultCommission != null ? String(e.orgDefaultCommission) : "",
          commission: String(e.commissionPerUnit),
        }));
        setRows(mapped);
        setSavedByProductId(snapshotRows(mapped));
        setAssignedNextCursor(nextCursor ?? null);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load defaults.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, assignedCursor, assignedSearchDebounced, listRefreshTick, fetchDefaults, mode, snapshotRows]);

  const tableRows = React.useMemo(() => {
    if (tab !== "catalog" || !catalogOnlyDefaults) return rows;
    return rows.filter((r) => (Number.parseFloat(r.commission) || 0) > 0);
  }, [tab, catalogOnlyDefaults, rows]);

  const onSave = async () => {
    setSaving(true);
    try {
      const items = rows
        .filter((r) => {
          const saved = savedByProductId.get(r.productId);
          if (!saved) {
            return r.commission.trim() !== "" && (Number.parseFloat(r.commission) || 0) !== 0;
          }
          return saved.commission !== r.commission;
        })
        .map((r) => ({
          productId: r.productId,
          commissionPerUnit: Number.parseFloat(r.commission) || 0,
        }));
      await saveDefaults(items);
      toast.success("Commission defaults saved for this page.");
      setSavedByProductId(snapshotRows(rows));
      setListRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onRemoveDefault = async (productId: string) => {
    if (!window.confirm("Remove commission default for this SKU?")) return;
    setRemovingId(productId);
    try {
      await saveDefaults([{ productId, commissionPerUnit: 0 }]);
      toast.success("Default removed.");
      setRows((prev) => prev.filter((r) => r.productId !== productId));
      if (tab === "assigned") setListRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setRemovingId(null);
    }
  };

  const colSpan = mode === "zone" ? 5 : 4;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "catalog" | "assigned")} className="w-full">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="catalog" className="text-xs sm:text-sm">
            Full catalogue
          </TabsTrigger>
          <TabsTrigger value="assigned" className="text-xs sm:text-sm">
            SKUs with default commission
          </TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="mt-4 space-y-3 outline-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Input
              className="max-w-md"
              placeholder="Search products…"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || catalogCursorStack.length === 0}
                onClick={() => {
                  const stack = [...catalogCursorStack];
                  const prev = stack.pop()!;
                  setCatalogCursorStack(stack);
                  setCatalogCursor(prev);
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !catalogNextCursor}
                onClick={() => {
                  if (!catalogNextCursor) return;
                  setCatalogCursorStack((s) => [...s, catalogCursor]);
                  setCatalogCursor(catalogNextCursor);
                }}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="catalog-only-defaults"
              checked={catalogOnlyDefaults}
              onCheckedChange={(v) => setCatalogOnlyDefaults(v === true)}
            />
            <Label htmlFor="catalog-only-defaults" className="text-sm font-normal text-muted-foreground">
              Show only SKUs with a commission default on this page
            </Label>
          </div>
        </TabsContent>
        <TabsContent value="assigned" className="mt-4 space-y-3 outline-none">
          <Input
            className="max-w-md"
            placeholder="Search by product name…"
            value={assignedSearch}
            onChange={(e) => setAssignedSearch(e.target.value)}
          />
        </TabsContent>
      </Tabs>

      {isDirty ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save this page"}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="max-h-[480px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-card">
              <tr className="text-left text-muted-foreground">
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Product</th>
                {mode === "zone" ? (
                  <th className="p-3 font-medium w-28">Org default</th>
                ) : null}
                <th className="p-3 font-medium w-28">Commission</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="p-6 text-center text-muted-foreground">
                    No rows on this page.
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => (
                  <tr key={r.productId} className="border-b border-border/60">
                    <td className="p-3 font-mono text-xs">{r.sku}</td>
                    <td className="p-3">{r.name}</td>
                    {mode === "zone" ? (
                      <td className="p-2">
                        <Input
                          className="h-8 bg-muted/50"
                          value={r.orgDefault || "—"}
                          readOnly
                          tabIndex={-1}
                        />
                      </td>
                    ) : null}
                    <td className="p-2">
                      <Input
                        className="h-8"
                        inputMode="decimal"
                        value={r.commission}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row) =>
                              row.productId === r.productId ? { ...row, commission: e.target.value } : row
                            )
                          )
                        }
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={removingId === r.productId}
                        onClick={() => void onRemoveDefault(r.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isDirty ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[min(100%-2rem,36rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
          <p className="text-sm text-muted-foreground">Unsaved commission changes on this page</p>
          <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving || loading}>
            {saving ? "Updating…" : "Update commissions"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
