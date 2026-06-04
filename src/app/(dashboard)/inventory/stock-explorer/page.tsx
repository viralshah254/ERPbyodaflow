"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fetchStockLevelsPageApi,
  type InventoryStockRow,
} from "@/lib/api/inventory-stock";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const RANGE_DEBOUNCE_MS = 500;

function parseOptionalBound(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number.parseFloat(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function AvailabilityBar({ available, onHand }: { available: number; onHand: number }) {
  if (onHand <= 0) return null;
  const pct = Math.min(100, Math.round((available / onHand) * 100));
  const tone =
    pct <= 20 ? "bg-red-500" : pct <= 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1 flex items-center gap-2 min-w-[5rem]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function AgeCell({ days }: { days: number }) {
  const tone =
    days >= 14
      ? "text-amber-700 dark:text-amber-400 font-semibold"
      : days >= 7
        ? "text-amber-600 dark:text-amber-500"
        : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <Icons.Clock className={cn("h-3.5 w-3.5 shrink-0", days >= 7 ? "text-amber-500" : "text-muted-foreground")} />
      <span className={tone}>{days}</span>
    </div>
  );
}

export default function InventoryStockExplorerPage() {
  const [rows, setRows] = React.useState<InventoryStockRow[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "In Stock" | "Low Stock" | "Out of Stock"
  >("all");
  const [ownershipFilter, setOwnershipFilter] = React.useState<"all" | "CoolCatch" | "Franchise">("all");

  const [minOnHand, setMinOnHand] = React.useState("");
  const [maxOnHand, setMaxOnHand] = React.useState("");
  const [minAvailable, setMinAvailable] = React.useState("");
  const [maxAvailable, setMaxAvailable] = React.useState("");
  const [minAge, setMinAge] = React.useState("");
  const [maxAge, setMaxAge] = React.useState("");
  const [debouncedRanges, setDebouncedRanges] = React.useState({
    minOnHand: "",
    maxOnHand: "",
    minAvailable: "",
    maxAvailable: "",
    minAge: "",
    maxAge: "",
  });

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    const id = window.setTimeout(
      () =>
        setDebouncedRanges({
          minOnHand,
          maxOnHand,
          minAvailable,
          maxAvailable,
          minAge,
          maxAge,
        }),
      RANGE_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [minOnHand, maxOnHand, minAvailable, maxAvailable, minAge, maxAge]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchStockLevelsPageApi({
          limit: pageSize,
          cursor: String(offset),
          search: debouncedSearch || undefined,
          status: statusFilter,
          ownership: ownershipFilter,
          minOnHand: parseOptionalBound(debouncedRanges.minOnHand),
          maxOnHand: parseOptionalBound(debouncedRanges.maxOnHand),
          minAvailable: parseOptionalBound(debouncedRanges.minAvailable),
          maxAvailable: parseOptionalBound(debouncedRanges.maxAvailable),
          minAgeDays: parseOptionalBound(debouncedRanges.minAge),
          maxAgeDays: parseOptionalBound(debouncedRanges.maxAge),
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load stock explorer.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [
      debouncedSearch,
      statusFilter,
      ownershipFilter,
      debouncedRanges,
      pageSize,
    ],
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const searchPending = searchInput.trim() !== debouncedSearch.trim();
  const rangesPending =
    minOnHand !== debouncedRanges.minOnHand ||
    maxOnHand !== debouncedRanges.maxOnHand ||
    minAvailable !== debouncedRanges.minAvailable ||
    maxAvailable !== debouncedRanges.maxAvailable ||
    minAge !== debouncedRanges.minAge ||
    maxAge !== debouncedRanges.maxAge;
  const tableBusy = fetching || searchPending || rangesPending;

  const rangeFiltersActive =
    debouncedRanges.minOnHand.trim() !== "" ||
    debouncedRanges.maxOnHand.trim() !== "" ||
    debouncedRanges.minAvailable.trim() !== "" ||
    debouncedRanges.maxAvailable.trim() !== "" ||
    debouncedRanges.minAge.trim() !== "" ||
    debouncedRanges.maxAge.trim() !== "";

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter !== "all") chips.push({ id: "status", label: "Status", value: statusFilter });
    if (ownershipFilter !== "all") {
      chips.push({ id: "ownership", label: "Ownership", value: ownershipFilter });
    }
    if (searchInput.trim()) chips.push({ id: "q", label: "Search", value: searchInput.trim() });
    if (rangeFiltersActive) chips.push({ id: "ranges", label: "Quantity & age", value: "Custom" });
    return chips;
  }, [statusFilter, ownershipFilter, searchInput, rangeFiltersActive]);

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setOwnershipFilter("all");
    setMinOnHand("");
    setMaxOnHand("");
    setMinAvailable("");
    setMaxAvailable("");
    setMinAge("");
    setMaxAge("");
  };

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + pageSize);
  };

  const columns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: InventoryStockRow) => (
          <span className="font-mono text-xs font-medium">{r.sku}</span>
        ),
        sticky: true,
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.sku.toLowerCase(),
      },
      {
        id: "name",
        header: "Product",
        accessor: (r: InventoryStockRow) => (
          <div className="min-w-[8rem]">
            <p className="font-medium leading-snug">{r.name}</p>
            {r.productFamily && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{r.productFamily}</p>
            )}
          </div>
        ),
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.name.toLowerCase(),
      },
      {
        id: "warehouse",
        header: "Location",
        accessor: (r: InventoryStockRow) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Icons.Warehouse className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{r.warehouse}{r.location ? ` / ${r.location}` : ""}</span>
          </div>
        ),
        sortable: true,
        sortValue: (r: InventoryStockRow) =>
          `${r.warehouse} ${r.location ?? ""}`.toLowerCase(),
      },
      {
        id: "ownership",
        header: "Ownership",
        accessor: (r: InventoryStockRow) => (
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-normal",
              r.ownership === "Franchise"
                ? "border-violet-300 text-violet-700 bg-violet-50/60 dark:bg-violet-950/30"
                : "border-sky-300 text-sky-700 bg-sky-50/60 dark:bg-sky-950/30",
            )}
          >
            {r.ownership ?? "CoolCatch"}
          </Badge>
        ),
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.ownership ?? "CoolCatch",
      },
      {
        id: "qty",
        header: "On hand",
        accessor: (r: InventoryStockRow) => (
          <span className="tabular-nums font-medium">{r.quantity.toLocaleString()}</span>
        ),
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.quantity,
      },
      {
        id: "reserved",
        header: "Reserved",
        accessor: (r: InventoryStockRow) => (
          <span className={cn("tabular-nums", r.reserved > 0 && "text-amber-600 font-medium")}>
            {r.reserved.toLocaleString()}
          </span>
        ),
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.reserved,
      },
      {
        id: "available",
        header: "Available",
        accessor: (r: InventoryStockRow) => (
          <div>
            <span
              className={cn(
                "tabular-nums font-semibold",
                r.status === "Out of Stock" && "text-red-600",
                r.status === "Low Stock" && "text-amber-600",
              )}
            >
              {r.available.toLocaleString()}
            </span>
            <AvailabilityBar available={r.available} onHand={r.quantity} />
          </div>
        ),
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.available,
      },
      {
        id: "age",
        header: "Age (days)",
        accessor: (r: InventoryStockRow) => <AgeCell days={r.ageDays ?? 0} />,
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.ageDays ?? 0,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: InventoryStockRow) => <StatusBadge status={r.status} />,
        sortable: true,
        sortValue: (r: InventoryStockRow) => r.status.toLowerCase(),
      },
    ],
    [],
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Stock Explorer"
        description="Global stock view by SKU, location, ownership, reserved status, and age."
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Stock Explorer" },
        ]}
        showCommandHint
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <Card className="shrink-0 overflow-hidden">
          <CardHeader className="space-y-4 pb-4">
            <div>
              <CardTitle>Global stock explorer</CardTitle>
              <CardDescription>
                Server-filtered inventory by SKU and warehouse. Search uses the product catalog index;
                quantity, age, and status filters run on the API.
              </CardDescription>
            </div>

            <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search SKU or product name…"
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              filters={[
                {
                  id: "status",
                  label: "Stock status",
                  options: [
                    { label: "All statuses", value: "all" },
                    { label: "In Stock", value: "In Stock" },
                    { label: "Low Stock", value: "Low Stock" },
                    { label: "Out of Stock", value: "Out of Stock" },
                  ],
                  value: statusFilter,
                  onChange: (v) =>
                    setStatusFilter(v as "all" | "In Stock" | "Low Stock" | "Out of Stock"),
                },
                {
                  id: "ownership",
                  label: "Ownership",
                  options: [
                    { label: "All", value: "all" },
                    { label: "CoolCatch", value: "CoolCatch" },
                    { label: "Franchise", value: "Franchise" },
                  ],
                  value: ownershipFilter,
                  onChange: (v) => setOwnershipFilter(v as "all" | "CoolCatch" | "Franchise"),
                },
              ]}
              activeFiltersCount={filterChips.length}
              onClearFilters={clearFilters}
              filterChips={filterChips}
              onRemoveFilterChip={(id) => {
                if (id === "status") setStatusFilter("all");
                if (id === "ownership") setOwnershipFilter("all");
                if (id === "q") setSearchInput("");
                if (id === "ranges") {
                  setMinOnHand("");
                  setMaxOnHand("");
                  setMinAvailable("");
                  setMaxAvailable("");
                  setMinAge("");
                  setMaxAge("");
                }
              }}
            />

            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icons.SlidersHorizontal className="h-4 w-4 shrink-0" />
                Quantity & age
                {rangesPending && (
                  <span className="text-xs font-normal text-muted-foreground">Applying…</span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {(
                  [
                    ["minOH", "Min on hand", minOnHand, setMinOnHand],
                    ["maxOH", "Max on hand", maxOnHand, setMaxOnHand],
                    ["minAv", "Min available", minAvailable, setMinAvailable],
                    ["maxAv", "Max available", maxAvailable, setMaxAvailable],
                    ["minAge", "Min age (days)", minAge, setMinAge],
                    ["maxAge", "Max age (days)", maxAge, setMaxAge],
                  ] as const
                ).map(([id, label, value, onChange]) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={id} className="text-xs text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      id={id}
                      inputMode="decimal"
                      placeholder="Any"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 border-t">
            {initialLoading ? (
              <div className="p-4">
                <SkeletonDataTable
                  rows={pageSize}
                  columnWidths={["w-20", "w-32", "w-28", "w-20", "w-16", "w-16", "w-24", "w-16", "w-20"]}
                />
              </div>
            ) : (
              <div className={LIST_TABLE_SURFACE_CLASS}>
                <TableLinearProgress active={tableBusy} />
                <div
                  className={cn(
                    LIST_TABLE_SCROLL_BODY_CLASS,
                    tableBusy && "pointer-events-none opacity-60",
                  )}
                >
                  <DataTable
                    data={rows}
                    columns={columns}
                    scrollMode="natural"
                    emptyMessage="No stock rows match your filters."
                  />
                </div>
              </div>
            )}
            <TablePagination
              className="border-t px-4"
              pageOffset={pageOffset}
              pageSize={pageSize}
              itemCount={initialLoading ? 0 : rows.length}
              hasMore={hasMore}
              loading={initialLoading}
              busy={tableBusy}
              onPrevious={goToPreviousPage}
              onNext={goToNextPage}
              entityLabel="stock rows"
              pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
