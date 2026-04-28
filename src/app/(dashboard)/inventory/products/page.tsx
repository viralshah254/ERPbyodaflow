"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/ui/data-table";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  fetchProductsApi,
  deleteProductApi,
} from "@/lib/api/products";
import { fetchProductCategoriesApi, type ItemCategoryRow } from "@/lib/api/product-categories";
import {
  fetchLatestInventoryCosting,
  fetchProductCostLayers,
  type InventoryCostingSnapshot,
  type ProductCostLayersResponse,
} from "@/lib/api/inventory-costing";
import { setProductsCache } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import type { ProductKind } from "@/lib/products/product-type";
import { productTypeSortKey, rowMatchesProductTypeFilter } from "@/lib/products/product-type";
import { ProductTypeBadge } from "@/components/products/ProductTypeBadge";
import { useAuthStore } from "@/stores/auth-store";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  productType?: ProductKind;
  category: string;
  stock: number;
  /** Weighted average inventory unit cost from last costing run (book basis). */
  avgInventoryCost?: number | null;
  status: string;
  lastUpdated: string;
  variantsCount: number;
  packagingCount: number;
}

function weightedAvgBookCostByProduct(costing: InventoryCostingSnapshot | null): Map<string, number> {
  const result = new Map<string, number>();
  if (!costing?.items?.length) return result;
  const agg = new Map<string, { q: number; v: number }>();
  for (const item of costing.items) {
    const q = item.quantity ?? 0;
    if (q <= 0) continue;
    const cur = agg.get(item.productId) ?? { q: 0, v: 0 };
    cur.q += q;
    cur.v += item.inventoryValue ?? 0;
    agg.set(item.productId, cur);
  }
  for (const [pid, { q, v }] of agg) {
    if (q > 0) result.set(pid, v / q);
  }
  return result;
}

function buildProductRow(row: ProductRow, avgCostMap: Map<string, number>): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    productType: row.productType,
    category: row.category ?? "",
    stock: row.currentStock ?? 0,
    avgInventoryCost: avgCostMap.has(row.id) ? avgCostMap.get(row.id)! : null,
    status: row.status === "ACTIVE" ? "Active" : row.status,
    lastUpdated: "",
    variantsCount: 0,
    packagingCount: 0,
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canDelete = permissions.includes("admin.settings");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"all" | ProductKind>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [rows, setRows] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<ItemCategoryRow[]>([]);
  const [costingRanAt, setCostingRanAt] = React.useState<string | null>(null);
  const [batchSheetProductId, setBatchSheetProductId] = React.useState<string | null>(null);
  const [layersPayload, setLayersPayload] = React.useState<ProductCostLayersResponse | null>(null);
  const [layersLoading, setLayersLoading] = React.useState(false);

  // Map categoryId → display name for the table column
  const categoryNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  React.useEffect(() => {
    let active = true;
    void Promise.all([
      fetchProductsApi(),
      fetchProductCategoriesApi().catch(() => [] as ItemCategoryRow[]),
      fetchLatestInventoryCosting().catch(() => null),
    ])
      .then(([products, cats, costing]) => {
        if (!active) return;
        setCategories(cats);
        setProductsCache(products);
        const avgMap = weightedAvgBookCostByProduct(costing);
        setCostingRanAt(costing?.ranAt ?? null);
        setRows(products.map((p) => buildProductRow(p, avgMap)));
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load products.");
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!batchSheetProductId) {
      setLayersPayload(null);
      return;
    }
    let cancelled = false;
    setLayersLoading(true);
    setLayersPayload(null);
    void fetchProductCostLayers(batchSheetProductId)
      .then((data) => {
        if (!cancelled) setLayersPayload(data);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load batches.");
      })
      .finally(() => {
        if (!cancelled) setLayersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [batchSheetProductId]);

  const filteredProducts = React.useMemo(() => {
    return rows.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      const matchesType = rowMatchesProductTypeFilter(product.productType, productTypeFilter);
      return matchesSearch && matchesStatus && matchesCategory && matchesType;
    });
  }, [rows, searchQuery, statusFilter, categoryFilter, productTypeFilter]);

  const handleView = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleDuplicate = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProductApi(id);
      toast.success("Product deleted.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const columns = [
    {
      id: "name",
      header: "Product Name",
      sortable: true,
      sortValue: (row: Product) => row.name.toLowerCase(),
      accessor: (row: Product) => (
        <div className="space-y-1">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.sku}</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {row.variantsCount} variants
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {row.packagingCount} UOMs
            </Badge>
          </div>
        </div>
      ),
      sticky: true,
    },
    {
      id: "productType",
      header: "Product type",
      sortable: true,
      sortValue: (row: Product) => productTypeSortKey(row.productType),
      accessor: (row: Product) => <ProductTypeBadge type={row.productType} />,
    },
    {
      id: "category",
      header: "Category",
      sortable: true,
      sortValue: (row: Product) =>
        (categoryNameById.get(row.category) ?? row.category ?? "").toLowerCase(),
      accessor: (row: Product) => {
        const name = categoryNameById.get(row.category) ?? row.category;
        return name ? (
          <Badge variant="secondary" className="text-xs font-normal">{name}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      id: "stock",
      header: "Stock",
      sortable: true,
      sortValue: (row: Product) => row.stock,
      accessor: (row: Product) => (
        <div className="text-right">
          <div className="font-medium">{row.stock}</div>
          {row.stock < 20 && (
            <div className="text-xs text-destructive">Low stock</div>
          )}
        </div>
      ),
    },
    {
      id: "avgCost",
      header: "Avg inventory cost",
      sortable: true,
      sortValue: (row: Product) => row.avgInventoryCost ?? -1,
      accessor: (row: Product) => {
        const v = row.avgInventoryCost;
        if (v == null || Number.isNaN(v)) {
          return <div className="text-right text-muted-foreground text-sm">—</div>;
        }
        return (
          <div className="text-right">
            <div className="font-medium tabular-nums">{formatMoney(v, "KES")}</div>
            <div className="text-[11px] text-muted-foreground">Book avg / unit</div>
          </div>
        );
      },
    },
    {
      id: "batchDrilldown",
      header: "",
      accessor: (row: Product) =>
        row.stock > 0 ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="View cost batches"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBatchSheetProductId(row.id);
                  }}
                >
                  <Icons.Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">FIFO-style batches & average</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      className: "w-[48px]",
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: Product) => row.status.toLowerCase(),
      accessor: (row: Product) => <StatusBadge status={row.status} />,
    },
    {
      id: "lastUpdated",
      header: "Last Updated",
      sortable: true,
      accessor: "lastUpdated" as keyof Product,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: Product) => (
        <RowActions
          actions={[
            {
              label: "View",
              icon: "Eye",
              onClick: () => handleView(row.id),
            },
            {
              label: "Edit",
              icon: "Edit",
              onClick: () => handleEdit(row.id),
            },
            {
              label: "Duplicate",
              icon: "Copy",
              onClick: () => handleDuplicate(row.id),
            },
            ...(canDelete
              ? [
                  {
                    label: "Delete",
                    icon: "Trash2" as const,
                    onClick: () => handleDelete(row.id),
                    variant: "destructive" as const,
                  },
                ]
              : []),
          ]}
        />
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <PageLayout
      title="Products"
      description="Manage your product catalog"
      actions={
        <Button onClick={() => router.push("/master/products")}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      }
    >
      <Card>
        <FiltersBar
          searchPlaceholder="Search products by name or SKU..."
          onSearchChange={setSearchQuery}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All", value: "all" },
                { label: "Active", value: "Active" },
                { label: "Low Stock", value: "Low Stock" },
                { label: "Out of Stock", value: "Out of Stock" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
            {
              id: "productType",
              label: "Product type",
              options: [
                { label: "All types", value: "all" },
                { label: "Purchased product", value: "RAW" },
                { label: "Finished product", value: "FINISHED" },
                { label: "Stock product", value: "BOTH" },
              ],
              value: productTypeFilter,
              onChange: (v) => setProductTypeFilter(v as "all" | ProductKind),
            },
            {
              id: "category",
              label: "Category",
              options: [
                { label: "All Categories", value: "all" },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ],
              value: categoryFilter,
              onChange: setCategoryFilter,
            },
          ]}
          activeFiltersCount={
            (statusFilter !== "all" ? 1 : 0) +
            (productTypeFilter !== "all" ? 1 : 0) +
            (categoryFilter !== "all" ? 1 : 0)
          }
          onClearFilters={() => {
            setStatusFilter("all");
            setProductTypeFilter("all");
            setCategoryFilter("all");
          }}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription className="space-y-1 max-w-xl">
                <span>
                  {filteredProducts.length} of {rows.length} products
                </span>
                {costingRanAt ? (
                  <span className="block text-xs text-muted-foreground">
                    Avg inventory cost uses the last costing snapshot ({new Date(costingRanAt).toLocaleString()}
                    ).{" "}
                    <Link href="/inventory/costing" className="text-primary underline-offset-4 hover:underline">
                      Run costing
                    </Link>{" "}
                    to refresh book values.
                  </span>
                ) : (
                  <span className="block text-xs text-muted-foreground">
                    Run{" "}
                    <Link href="/inventory/costing" className="text-primary underline-offset-4 hover:underline">
                      inventory costing
                    </Link>{" "}
                    first so average cost can populate from receipts.
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Icons.Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Icons.Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredProducts}
            columns={columns}
            onRowClick={(row) => handleView(row.id)}
            emptyMessage="No products found. Create your first product to get started."
          />
        </CardContent>
      </Card>

      <Sheet open={batchSheetProductId != null} onOpenChange={(open) => !open && setBatchSheetProductId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pr-8">
            <SheetTitle>{rows.find((r) => r.id === batchSheetProductId)?.name ?? "Cost batches"}</SheetTitle>
            <SheetDescription>
              Receipt-based FIFO layers remaining in stock (after issues and transfers). Uses GRN line amounts plus
              landed-cost snapshots where available.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {layersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                Loading batches…
              </div>
            ) : layersPayload ? (
              <>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm grid gap-1 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Fifo qty total</span>{" "}
                    <span className="font-medium tabular-nums">{layersPayload.totalQty.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">System on-hand</span>{" "}
                    <span className="font-medium tabular-nums">{layersPayload.stockLevelQty.toLocaleString()}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Weighted avg (fifo layers)</span>{" "}
                    <span className="font-medium tabular-nums">
                      {layersPayload.totalQty > 0
                        ? `${formatMoney(layersPayload.averageUnitCost, layersPayload.currency)} / unit`
                        : "—"}
                    </span>
                  </div>
                  {!layersPayload.fifoMatchesStock ? (
                    <div className="sm:col-span-2 rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                      FIFO reconciliation differs from recorded stock — common after transfers or adjustments. Book cost
                      still uses costing run; batches are operational guidance.
                    </div>
                  ) : null}
                </div>
                {layersPayload.batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No receipt layers found for remaining stock.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">Warehouse</th>
                          <th className="px-3 py-2 font-medium">Qty</th>
                          <th className="px-3 py-2 font-medium text-right">Unit cost</th>
                          <th className="px-3 py-2 font-medium text-right">Line value</th>
                          <th className="px-3 py-2 font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {layersPayload.batches.map((b, i) => (
                          <tr key={`${b.reference ?? ""}-${b.date}-${i}`} className="border-t border-border/60">
                            <td className="px-3 py-2 align-top">
                              <div>{b.warehouseName}</div>
                              <div className="text-[11px] text-muted-foreground capitalize">
                                {b.sourceType.replace(/_/g, " ")}
                              </div>
                            </td>
                            <td className="px-3 py-2 tabular-nums">{b.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b.unitCost, b.currency)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b.lineValue, b.currency)}</td>
                            <td className="px-3 py-2 align-top">
                              <div className="text-xs text-muted-foreground">{new Date(b.date).toLocaleString()}</div>
                              {b.reference ? <div>{b.reference}</div> : null}
                              {b.grnId ? (
                                <Link
                                  href={`/inventory/receipts/${encodeURIComponent(b.grnId)}`}
                                  className="text-primary text-xs underline-offset-4 hover:underline inline-block mt-0.5"
                                >
                                  Open GRN
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
}
