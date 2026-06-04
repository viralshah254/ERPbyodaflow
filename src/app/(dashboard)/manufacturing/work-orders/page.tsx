"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { t, manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import {
  checkWorkOrderAvailability,
  createManufacturingWorkOrder,
  fetchManufacturingBoms,
  fetchManufacturingRoutes,
  fetchManufacturingWorkOrdersPage,
  runManufacturingWorkOrderAction,
  type ManufacturingBom,
  type ManufacturingRoute,
  type ManufacturingWorkOrder,
  type MaterialAvailabilityLine,
} from "@/lib/api/manufacturing";
import { fetchGRNs } from "@/lib/api/grn";
import { type PurchasingDocRow } from "@/lib/types/purchasing";
import { hydrateProductsFromApi, listProducts, subscribeProductsCache } from "@/lib/data/products.repo";
import { isApiConfigured } from "@/lib/api/client";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Released", value: "RELEASED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function WorkOrdersPage() {
  const canWrite = useCanWriteManufacturing();
  const terminology = useTerminology();
  const woLabel = t("workOrder", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);

  const [products, setProducts] = React.useState(() => listProducts());
  React.useEffect(() => subscribeProductsCache(() => setProducts(listProducts())), []);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [rows, setRows] = React.useState<ManufacturingWorkOrder[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const [boms, setBoms] = React.useState<ManufacturingBom[]>([]);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMetaLoading, setSheetMetaLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [bomId, setBomId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [routingId, setRoutingId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [dueDate, setDueDate] = React.useState("");
  const [grnId, setGrnId] = React.useState("");
  const [availableGrns, setAvailableGrns] = React.useState<PurchasingDocRow[]>([]);
  const [grnsLoading, setGrnsLoading] = React.useState(false);
  const [availLines, setAvailLines] = React.useState<MaterialAvailabilityLine[]>([]);
  const [availLoading, setAvailLoading] = React.useState(false);
  const availDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchManufacturingWorkOrdersPage({
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load work orders.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  React.useEffect(() => {
    hasLoadedOnce.current = false;
    setPageOffset(0);
    void loadPage(0);
  }, [loadPage]);

  const handleRefresh = React.useCallback(() => {
    void loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - PAGE_SIZE));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + PAGE_SIZE);
  };

  const searchPending = search.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, search]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearch("");
  };

  const runAction = React.useCallback(
    async (id: string, action: Parameters<typeof runManufacturingWorkOrderAction>[1]) => {
      try {
        await runManufacturingWorkOrderAction(id, action);
        await loadPage(pageOffset);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      }
    },
    [loadPage, pageOffset]
  );

  React.useEffect(() => {
    if (!sheetOpen) return;
    setSheetMetaLoading(true);
    void Promise.all([
      fetchManufacturingBoms({ includeItems: true }),
      fetchManufacturingRoutes({ includeOperations: true }),
      hydrateProductsFromApi(),
    ])
      .then(([nextBoms, nextRoutes]) => {
        setBoms(nextBoms);
        setRoutes(nextRoutes);
      })
      .catch(() => {
        toast.error("Failed to load BOMs and routing for the form.");
      })
      .finally(() => setSheetMetaLoading(false));
  }, [sheetOpen]);

  React.useEffect(() => {
    if (availDebounce.current) clearTimeout(availDebounce.current);
    if (!bomId || !Number(quantity)) {
      setAvailLines([]);
      return;
    }
    availDebounce.current = setTimeout(async () => {
      setAvailLoading(true);
      try {
        const result = await checkWorkOrderAvailability(bomId, Number(quantity));
        setAvailLines(result.lines);
      } catch {
        setAvailLines([]);
      } finally {
        setAvailLoading(false);
      }
    }, 400);
    return () => {
      if (availDebounce.current) clearTimeout(availDebounce.current);
    };
  }, [bomId, quantity]);

  const hasShortfall = availLines.some((line) => line.shortfall > 0);

  React.useEffect(() => {
    if (!grnId) return;
    const selectedGrn = availableGrns.find((g) => g.id === grnId);
    if (!selectedGrn) return;
    const selectedBom = boms.find((b) => b.id === bomId);

    if (selectedBom && selectedBom.items.length > 0) {
      const bomProductIds = new Set(selectedBom.items.map((i) => i.productId).filter(Boolean));
      const matchedWeight = (selectedGrn.lineAvailability ?? [])
        .filter((l) => l.available && bomProductIds.has(l.productId ?? ""))
        .reduce((sum, l) => sum + l.receivedWeightKg, 0);
      if (matchedWeight > 0) setQuantity(String(matchedWeight));
      else if (selectedGrn.receivedWeightKg) setQuantity(String(selectedGrn.receivedWeightKg));
    } else if (selectedGrn.receivedWeightKg) {
      setQuantity(String(selectedGrn.receivedWeightKg));
    }

    if (!selectedBom) {
      const firstLine = (selectedGrn.lineAvailability ?? []).find((l) => l.available && l.productId);
      if (firstLine?.productId) setProductId(firstLine.productId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grnId, bomId]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: ManufacturingWorkOrder) => <span className="font-mono text-sm font-semibold">{r.number}</span>,
        sticky: true,
      },
      {
        id: "product",
        header: "Product",
        accessor: (r: ManufacturingWorkOrder) => (
          <span className="block max-w-[min(360px,45vw)] truncate text-sm" title={r.productSku ? `${r.productSku} - ${r.productName}` : r.productName ?? r.productId}>
            {r.productSku ? `${r.productSku} - ${r.productName}` : r.productName ?? r.productId}
          </span>
        ),
      },
      { id: "bom", header: "BOM", accessor: (r: ManufacturingWorkOrder) => r.bomName ?? "—" },
      { id: "routing", header: "Routing", accessor: (r: ManufacturingWorkOrder) => r.routingName ?? "—" },
      {
        id: "grn",
        header: "GRN batch",
        accessor: (r: ManufacturingWorkOrder) =>
          r.grnNumber ? (
            <span className="text-xs font-medium text-primary">{r.grnNumber}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "qty",
        header: "Planned qty",
        accessor: (r: ManufacturingWorkOrder) => <span className="tabular-nums text-sm">{r.plannedQuantity}</span>,
      },
      {
        id: "produced",
        header: "Produced",
        accessor: (r: ManufacturingWorkOrder) => <span className="tabular-nums text-sm">{r.producedQuantity}</span>,
      },
      {
        id: "open",
        header: "Open",
        accessor: (r: ManufacturingWorkOrder) => <span className="tabular-nums text-sm">{r.openQuantity}</span>,
      },
      { id: "dueDate", header: "Due date", accessor: (r: ManufacturingWorkOrder) => r.dueDate?.slice(0, 10) ?? "—" },
      { id: "status", header: "Status", accessor: (r: ManufacturingWorkOrder) => <StatusBadge status={r.status} /> },
      {
        id: "actions",
        header: "",
        accessor: (r: ManufacturingWorkOrder) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {canWrite && r.status === "DRAFT" && (
              <Button size="sm" variant="ghost" onClick={() => void runAction(r.id, { action: "release" })}>
                Release
              </Button>
            )}
            {canWrite && r.status === "RELEASED" && (
              <Button size="sm" variant="ghost" onClick={() => void runAction(r.id, { action: "start" })}>
                Start
              </Button>
            )}
            {canWrite && r.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void runAction(r.id, {
                    action: "complete",
                    producedQuantity: r.openQuantity > 0 ? r.quantity : r.producedQuantity,
                  })
                }
              >
                Complete
              </Button>
            )}
          </div>
        ),
      },
    ],
    [runAction]
  );

  const loadAvailableGrns = React.useCallback(async () => {
    if (!isApiConfigured()) return;
    setGrnsLoading(true);
    try {
      const all = await fetchGRNs({ availableForProcessing: true });
      setAvailableGrns(all);
    } catch {
      setAvailableGrns([]);
    } finally {
      setGrnsLoading(false);
    }
  }, []);

  function resetForm() {
    setBomId("");
    setProductId("");
    setRoutingId("");
    setGrnId("");
    setQuantity("1");
    setDueDate("");
    setAvailLines([]);
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={woLabel}
        description="Create, issue, and receive work orders"
        breadcrumbs={[{ label: areaLabel, href: "/manufacturing/work-orders" }, { label: woLabel }]}
        sticky
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New work order
            </Button>
          ) : undefined
        }
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search number, product, BOM, or GRN…"
          searchValue={search}
          onSearchChange={setSearch}
          searchInputProps={{
            spellCheck: false,
            autoComplete: "off",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeFiltersCount={filterChips.length}
          onClearFilters={handleClearFilters}
          filterChips={filterChips}
          onRemoveFilterChip={handleRemoveFilterChip}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={initialLoading || fetching}
              onClick={handleRefresh}
            >
              <Icons.RefreshCw
                className={cn("h-4 w-4 mr-1.5", (initialLoading || fetching) && "animate-spin")}
              />
              Refresh
            </Button>
          }
        />

        {initialLoading ? (
          <SkeletonDataTable
            rows={PAGE_SIZE}
            columnWidths={["w-24", "w-44", "w-32", "w-28", "w-20", "w-20", "w-20", "w-16", "w-24", "w-24", "w-28"]}
          />
        ) : (
          <div className={LIST_TABLE_SURFACE_CLASS}>
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                LIST_TABLE_SCROLL_BODY_CLASS,
                tableBusy && "pointer-events-none opacity-60"
              )}
            >
              <DataTable
                data={rows}
                columns={columns}
                emptyMessage="No work orders match your filters."
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0"
                />
            </div>
          </div>
        )}

        <TablePagination
          sticky
          pageOffset={pageOffset}
          pageSize={PAGE_SIZE}
          itemCount={initialLoading ? 0 : rows.length}
          hasMore={hasMore}
          loading={initialLoading || fetching}
          busy={searchPending}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          entityLabel="work orders"
        />
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            resetForm();
          } else {
            void loadAvailableGrns();
          }
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New work order</SheetTitle>
            <SheetDescription>
              {grnId
                ? "Link a GRN batch to track input weight and production outputs."
                : "Create a production order from a BOM or for a specific product."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                GRN batch
                <span className="ml-1 text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select
                value={grnId || "__none__"}
                onValueChange={(value) => {
                  const next = value === "__none__" ? "" : value;
                  setGrnId(next);
                  if (!next && !bomId) setProductId("");
                }}
              >
                <SelectTrigger>
                  {grnsLoading ? (
                    <span className="text-muted-foreground text-sm">Loading receipts…</span>
                  ) : (
                    <SelectValue placeholder="Select a GRN receipt" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No GRN linked</SelectItem>
                  {availableGrns.map((g) => {
                    const eligible = g.eligibleLineCount ?? g.lineAvailability?.filter((l) => l.available).length ?? 0;
                    const total = g.lineAvailability?.length ?? 0;
                    const hasWo = !!(g.workOrderId && g.workOrderStatus !== "CANCELLED");
                    return (
                      <SelectItem key={g.id} value={g.id}>
                        {g.number}
                        {g.poRef ? ` · PO: ${g.poRef}` : ""}
                        {` · ${g.status}`}
                        {total > 0 ? ` · ${eligible}/${total} lines` : ""}
                        {g.receivedWeightKg ? ` · ${g.receivedWeightKg.toLocaleString()} kg` : ""}
                        {hasWo ? ` · ⚠ ${g.workOrderNumber ?? "WO linked"}` : ""}
                      </SelectItem>
                    );
                  })}
                  {!grnsLoading && availableGrns.length === 0 && (
                    <SelectItem value="__empty__" disabled>
                      No available receipts
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {grnId && (() => {
                const grn = availableGrns.find((g) => g.id === grnId);
                if (!grn) return null;
                const lines = grn.lineAvailability?.filter((l) => l.available) ?? [];
                const hasWo = !!(grn.workOrderId && grn.workOrderStatus !== "CANCELLED");
                return (
                  <div className="space-y-1.5">
                    {hasWo && (
                      <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <Icons.AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          This GRN is already linked to{" "}
                          <span className="font-medium">{grn.workOrderNumber ?? "a work order"}</span>. Creating another
                          will be blocked.
                        </span>
                      </div>
                    )}
                    <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
                      {lines.length > 0 ? (
                        lines.map((l, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{l.productName}</span>
                            <span className="font-medium tabular-nums">{l.receivedWeightKg.toLocaleString()} kg</span>
                          </div>
                        ))
                      ) : grn.receivedWeightKg ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Total received</span>
                          <span className="font-medium tabular-nums">{grn.receivedWeightKg.toLocaleString()} kg</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label>BOM</Label>
              <Select
                value={bomId || "__none__"}
                disabled={sheetMetaLoading}
                onValueChange={(value) => {
                  const nextBomId = value === "__none__" ? "" : value;
                  setBomId(nextBomId);
                  const bom = boms.find((item) => item.id === nextBomId);
                  if (bom) {
                    setProductId(bom.finishedProductId);
                    if (bom.routeId) setRoutingId(bom.routeId);
                  }
                }}
              >
                <SelectTrigger>
                  {sheetMetaLoading ? (
                    <span className="text-muted-foreground text-sm">Loading BOMs…</span>
                  ) : (
                    <SelectValue placeholder="Optional BOM" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No BOM</SelectItem>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.code} - {bom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!grnId && !bomId && (
              <div className="space-y-2">
                <Label>
                  Finished product
                  <span className="ml-1 text-xs text-destructive">*</span>
                </Label>
                <Select value={productId} onValueChange={setProductId} disabled={sheetMetaLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Routing</Label>
              <Select
                value={routingId || "__none__"}
                disabled={sheetMetaLoading}
                onValueChange={(v) => setRoutingId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional routing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No routing</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.code} - {route.name} ({route.operations.length} ops)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            {bomId && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Material availability</span>
                  {availLoading && <Icons.Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  {!availLoading && hasShortfall && (
                    <Badge variant="destructive" className="text-xs">
                      <Icons.AlertTriangle className="mr-1 h-3 w-3" />
                      Shortfall
                    </Badge>
                  )}
                  {!availLoading && !hasShortfall && availLines.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Icons.CheckCircle2 className="mr-1 h-3 w-3" />
                      All available
                    </Badge>
                  )}
                </div>
                {availLines.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-1 font-medium">Component</th>
                        <th className="text-right py-1 font-medium">Required</th>
                        <th className="text-right py-1 font-medium">On hand</th>
                        <th className="text-right py-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availLines.map((line) => (
                        <tr key={line.productId} className="border-b border-border/40 last:border-0">
                          <td className="py-1 pr-2">
                            {line.productSku ? `${line.productSku}` : line.productName}
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {line.requiredQty} {line.uom}
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {line.onHandQty} {line.uom}
                          </td>
                          <td className="py-1 text-right">
                            {line.shortfall > 0 ? (
                              <span className="text-destructive font-medium">−{line.shortfall}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {availLines.length === 0 && !availLoading && (
                  <p className="text-xs text-muted-foreground">No component lines on this BOM.</p>
                )}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => { setSheetOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              disabled={saving || sheetMetaLoading || (!productId && !grnId && !bomId)}
              onClick={async () => {
                setSaving(true);
                try {
                  await createManufacturingWorkOrder({
                    productId,
                    bomId: bomId || undefined,
                    routingId: routingId || undefined,
                    grnId: grnId || undefined,
                    quantity: Number(quantity) || 0,
                    dueDate: dueDate || undefined,
                  });
                  toast.success("Work order created.");
                  setSheetOpen(false);
                  resetForm();
                  await loadPage(0);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create work order.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {hasShortfall && <Icons.AlertTriangle className="mr-2 h-4 w-4 text-amber-400" />}
              Create work order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
