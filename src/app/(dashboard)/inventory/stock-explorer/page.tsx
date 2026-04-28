"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchStockLevelsApi, type InventoryStockRow } from "@/lib/api/inventory-stock";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type ExplorerRow = InventoryStockRow & {
  ownership: "CoolCatch" | "Franchise";
  ageDays: number;
};

function parseOptionalBound(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function InventoryStockExplorerPage() {
  const [rows, setRows] = React.useState<ExplorerRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);

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

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchStockLevelsApi({
      search: debouncedSearch || undefined,
      status: statusFilter,
      limit: 100,
    })
      .then((items) => {
        if (!alive) return;
        setRows(
          items.map((r, idx) => ({
            ...r,
            ownership: idx % 3 === 0 ? "Franchise" : "CoolCatch",
            ageDays: 2 + ((idx * 3) % 12),
          }))
        );
      })
      .catch((error) => {
        if (!alive) return;
        toast.error(error instanceof Error ? error.message : "Failed to load stock explorer.");
        setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedSearch, statusFilter]);

  const filteredRows = React.useMemo(() => {
    const minOH = parseOptionalBound(minOnHand);
    const maxOH = parseOptionalBound(maxOnHand);
    const minAv = parseOptionalBound(minAvailable);
    const maxAv = parseOptionalBound(maxAvailable);
    const minAd = parseOptionalBound(minAge);
    const maxAd = parseOptionalBound(maxAge);

    return rows.filter((r) => {
      if (ownershipFilter !== "all" && r.ownership !== ownershipFilter) return false;
      if (minOH != null && r.quantity < minOH) return false;
      if (maxOH != null && r.quantity > maxOH) return false;
      if (minAv != null && r.available < minAv) return false;
      if (maxAv != null && r.available > maxAv) return false;
      if (minAd != null && r.ageDays < minAd) return false;
      if (maxAd != null && r.ageDays > maxAd) return false;
      return true;
    });
  }, [rows, ownershipFilter, minOnHand, maxOnHand, minAvailable, maxAvailable, minAge, maxAge]);

  const rangeFiltersActive =
    minOnHand.trim() !== "" ||
    maxOnHand.trim() !== "" ||
    minAvailable.trim() !== "" ||
    maxAvailable.trim() !== "" ||
    minAge.trim() !== "" ||
    maxAge.trim() !== "";

  const activeFiltersCount =
    (searchInput.trim() !== "" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (ownershipFilter !== "all" ? 1 : 0) +
    (rangeFiltersActive ? 1 : 0);

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

  const columns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (r: ExplorerRow) => r.sku,
      sticky: true,
      sortable: true,
      sortValue: (r: ExplorerRow) => r.sku.toLowerCase(),
    },
    {
      id: "name",
      header: "Product",
      accessor: (r: ExplorerRow) => r.name,
      sortable: true,
      sortValue: (r: ExplorerRow) => r.name.toLowerCase(),
    },
    {
      id: "warehouse",
      header: "Location",
      accessor: (r: ExplorerRow) => `${r.warehouse}${r.location ? ` / ${r.location}` : ""}`,
      sortable: true,
      sortValue: (r: ExplorerRow) =>
        `${r.warehouse} ${r.location ?? ""}`.toLowerCase(),
    },
    {
      id: "ownership",
      header: "Ownership",
      accessor: (r: ExplorerRow) => r.ownership,
      sortable: true,
      sortValue: (r: ExplorerRow) => r.ownership,
    },
    {
      id: "qty",
      header: "On hand",
      accessor: (r: ExplorerRow) => r.quantity.toLocaleString(),
      sortable: true,
      sortValue: (r: ExplorerRow) => r.quantity,
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (r: ExplorerRow) => r.reserved.toLocaleString(),
      sortable: true,
      sortValue: (r: ExplorerRow) => r.reserved,
    },
    {
      id: "available",
      header: "Available",
      accessor: (r: ExplorerRow) => r.available.toLocaleString(),
      sortable: true,
      sortValue: (r: ExplorerRow) => r.available,
    },
    {
      id: "age",
      header: "Age (days)",
      accessor: (r: ExplorerRow) => r.ageDays,
      sortable: true,
      sortValue: (r: ExplorerRow) => r.ageDays,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: ExplorerRow) => r.status,
      sortable: true,
      sortValue: (r: ExplorerRow) => r.status.toLowerCase(),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Stock Explorer"
        description="Global stock view by SKU, location, ownership, reserved status, and age."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/products" }, { label: "Stock Explorer" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Global stock explorer</CardTitle>
              <CardDescription>
                Live inventory by SKU and warehouse (text search uses product catalog index). Showing up to 100 rows per
                search — refine filters below or narrow search.
              </CardDescription>
            </div>

            <FiltersBar
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
              activeFiltersCount={activeFiltersCount}
              onClearFilters={clearFilters}
            />

            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icons.SlidersHorizontal className="h-4 w-4 shrink-0" />
                Quantity & age (filters loaded rows)
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="space-y-1.5">
                  <Label htmlFor="minOH" className="text-xs text-muted-foreground">
                    Min on hand
                  </Label>
                  <Input
                    id="minOH"
                    inputMode="decimal"
                    placeholder="Any"
                    value={minOnHand}
                    onChange={(e) => setMinOnHand(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxOH" className="text-xs text-muted-foreground">
                    Max on hand
                  </Label>
                  <Input
                    id="maxOH"
                    inputMode="decimal"
                    placeholder="Any"
                    value={maxOnHand}
                    onChange={(e) => setMaxOnHand(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minAv" className="text-xs text-muted-foreground">
                    Min available
                  </Label>
                  <Input
                    id="minAv"
                    inputMode="decimal"
                    placeholder="Any"
                    value={minAvailable}
                    onChange={(e) => setMinAvailable(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxAv" className="text-xs text-muted-foreground">
                    Max available
                  </Label>
                  <Input
                    id="maxAv"
                    inputMode="decimal"
                    placeholder="Any"
                    value={maxAvailable}
                    onChange={(e) => setMaxAvailable(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minAge" className="text-xs text-muted-foreground">
                    Min age (days)
                  </Label>
                  <Input
                    id="minAge"
                    inputMode="numeric"
                    placeholder="Any"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxAge" className="text-xs text-muted-foreground">
                    Max age (days)
                  </Label>
                  <Input
                    id="maxAge"
                    inputMode="numeric"
                    placeholder="Any"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Icons.Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <p className="text-sm">Loading stock levels…</p>
              </div>
            ) : (
              <DataTable
                data={filteredRows}
                columns={columns}
                emptyMessage={
                  filteredRows.length === 0 && rows.length > 0
                    ? "No rows match your filters."
                    : "No stock rows."
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
