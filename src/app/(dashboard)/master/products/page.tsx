"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
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
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { createProductApi, fetchProductSkusApi, fetchProductCodesApi, fetchProductsPageApi, fetchProductFamiliesApi, deleteProductApi } from "@/lib/api/products";
import { importProductsApi, exportProductsCsvApi, downloadProductsTemplateCsv } from "@/lib/api/import-export";
import type { ImportProductsResult } from "@/lib/api/import-export";
import { fetchProductCategoriesApi, createProductCategoryApi } from "@/lib/api/product-categories";
import { fetchProductUomsApi } from "@/lib/api/uom";
import { fetchFinancialTaxesApi } from "@/lib/api/financial-taxes";
import type { TaxRow } from "@/lib/types/taxes";
import { setProductsCache } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import { productTypeLabel } from "@/lib/products/product-type";
import { ProductTypeBadge } from "@/components/products/ProductTypeBadge";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const productIcon = "Package" as const;
const PRODUCTS_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

/** Derive next sequential SKU from existing SKUs. */
function suggestNextSku(existing: string[]): string {
  const numbers = existing
    .map((s) => {
      const m = s.match(/(\d+)(?:\D*)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `SKU-${String(max + 1).padStart(3, "0")}`;
}

/** Derive next sequential 5-digit product code from existing codes (e.g. 00001, 00002). */
function suggestNextCode(existing: string[]): string {
  const numbers = existing
    .map((s) => {
      const m = s.match(/^(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(max + 1).padStart(5, "0");
}

export default function MasterProductsPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const permissions = useAuthStore((s) => s.permissions);
  const canDeleteProduct = permissions.includes("admin.settings");
  const productLabel = t("product", terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"RAW" | "FINISHED" | "BOTH" | "">("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [familyFilter, setFamilyFilter] = React.useState("");
  const [families, setFamilies] = React.useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [allRows, setAllRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(PRODUCTS_PAGE_SIZE);
  const [saving, setSaving] = React.useState(false);
  const [listCursor, setListCursor] = React.useState("0");
  const [listCursorStack, setListCursorStack] = React.useState<string[]>([]);
  const [listNextCursor, setListNextCursor] = React.useState<string | null>(null);
  const [listHasMore, setListHasMore] = React.useState(false);

  // Step 1 fields
  const [step, setStep] = React.useState<1 | 2>(1);
  const [sku, setSku] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [productType, setProductType] = React.useState<"RAW" | "FINISHED" | "BOTH" | "">("");
  const [categoryId, setCategoryId] = React.useState("");
  const [productFamily, setProductFamily] = React.useState("");
  const [unit, setUnit] = React.useState("");

  const [taxCodes, setTaxCodes] = React.useState<TaxRow[]>([]);
  const [defaultTaxCodeId, setDefaultTaxCodeId] = React.useState("");
  const [categories, setCategories] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [deleteConfirmProductId, setDeleteConfirmProductId] = React.useState<string | null>(null);
  const [newCategoryCode, setNewCategoryCode] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [uomOptions, setUomOptions] = React.useState<string[]>([]);

  // Bulk import / export
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportProductsResult | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const ACCEPTED_IMPORT = ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const pickImportFile = (file: File | null) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      toast.error("Please choose a .csv, .xlsx or .xls file.");
      return;
    }
    setImportFile(file);
    setImportResult(null);
  };

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadCategories = React.useCallback(async () => {
    try {
      const list = await fetchProductCategoriesApi();
      setCategories(list.filter((c) => c.isActive).map((c) => ({ id: c.id, code: c.code, name: c.name })));
    } catch { setCategories([]); }
  }, []);

  const loadUoms = React.useCallback(async () => {
    try {
      const list = await fetchProductUomsApi();
      const codes = list.map((u) => u.code);
      setUomOptions(codes.length > 0 ? codes : ["EA", "KG", "L", "M", "PCS"]);
    } catch { setUomOptions(["EA", "KG", "L", "M", "PCS"]); }
  }, []);

  const loadFamilies = React.useCallback(async () => {
    try {
      setFamilies(await fetchProductFamiliesApi());
    } catch { setFamilies([]); }
  }, []);

  React.useEffect(() => { void loadCategories(); }, [loadCategories]);
  React.useEffect(() => { void loadUoms(); }, [loadUoms]);
  React.useEffect(() => { void loadFamilies(); }, [loadFamilies]);

  React.useEffect(() => {
    setListCursor("0");
    setListCursorStack([]);
    setListNextCursor(null);
  }, [debouncedSearch, statusFilter, productTypeFilter, categoryFilter, familyFilter, pageSize]);

  const refreshProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchProductsPageApi({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        productType: productTypeFilter || undefined,
        categoryId: categoryFilter || undefined,
        productFamily: familyFilter || undefined,
        limit: pageSize,
        cursor: listCursor,
        includeStock: true,
      });
      setAllRows(page.items);
      setProductsCache(page.items);
      setListNextCursor(page.nextCursor);
      setListHasMore(page.hasMore);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [debouncedSearch, statusFilter, productTypeFilter, categoryFilter, familyFilter, listCursor, pageSize]);

  React.useEffect(() => { void refreshProducts(); }, [refreshProducts]);

  React.useEffect(() => {
    if (drawerOpen) {
      fetchProductSkusApi()
        .then((skus) => setSku(suggestNextSku(skus)))
        .catch(() => {});
      fetchProductCodesApi()
        .then((codes) => setCode(suggestNextCode(codes)))
        .catch(() => setCode("00001"));
      fetchFinancialTaxesApi()
        .then((taxes) => setTaxCodes(taxes))
        .catch(() => setTaxCodes([]));
    }
  }, [drawerOpen]);

  const categoryNameById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const existingProductFamilies = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      const f = r.productFamily?.trim();
      if (f) set.add(f);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const columns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: ProductRow) => (
          <div>
            <span className="font-mono font-medium">{r.sku}</span>
          </div>
        ),
        sticky: true,
      },
      {
        id: "productFamily",
        header: "Product family",
        accessor: (r: ProductRow) => r.productFamily?.trim() || "—",
      },
      { id: "name", header: "Name", accessor: "name" as keyof ProductRow },
      {
        id: "category",
        header: "Category",
        accessor: (r: ProductRow) =>
          r.categoryName ?? (r.category ? categoryNameById.get(r.category) : undefined) ?? "—",
      },
      {
        id: "productType",
        header: "Type",
        accessor: (r: ProductRow) => <ProductTypeBadge type={r.productType} />,
      },
      { id: "unit", header: "Unit", accessor: "unit" as keyof ProductRow },
      {
        id: "currentStock",
        header: "Stock",
        accessor: (r: ProductRow) => r.currentStock ?? "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: ProductRow) => <StatusBadge status={r.status} />,
      },
      {
        id: "actions",
        header: "",
        accessor: (r: ProductRow) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions
              actions={[
                {
                  label: "Edit",
                  icon: "Pencil",
                  onClick: () => router.push(`/master/products/${r.id}`),
                },
                {
                  label: "View",
                  icon: "Eye",
                  onClick: () => router.push(`/master/products/${r.id}`),
                },
                ...(canDeleteProduct
                  ? [
                      {
                        label: "Delete",
                        icon: "Trash2" as const,
                        onClick: () => setDeleteConfirmProductId(r.id),
                        variant: "destructive" as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        ),
        className: "w-[50px]",
      },
    ],
    [categoryNameById, router, canDeleteProduct]
  );

  const resetForm = () => {
    setStep(1);
    setSku("");
    setCode("");
    setName("");
    setCategoryId("");
    setProductFamily("");
    setProductType("");
    setUnit("");
    setDefaultTaxCodeId("");
  };

  const handleCreate = async () => {
    const trimmedSku = sku.trim();
    if (!trimmedSku || !name.trim()) {
      toast.error("SKU and Name are required.");
      return;
    }
    setSaving(true);
    try {
      const freshSkus = await fetchProductSkusApi();
      if (freshSkus.some((s) => s.toLowerCase() === trimmedSku.toLowerCase())) {
        toast.error("This SKU is already in use.");
        setSaving(false);
        return;
      }
    } catch {
      setSaving(false);
      return;
    }
    const selectedUnit = unit.trim() || (uomOptions[0] ?? "EA");
    const payload = {
      sku: trimmedSku,
      code: code.trim() || undefined,
      name: name.trim(),
      productFamily: productFamily.trim() || undefined,
      category: categoryId.trim() || undefined,
      productType: productType || undefined,
      defaultTaxCodeId: defaultTaxCodeId || undefined,
      unit: selectedUnit,
      baseUom: selectedUnit,
      status: "ACTIVE" as const,
    };
    try {
      const created = await createProductApi(payload);
      toast.success(`${productTypeLabel(productType || undefined)} created.`);
      resetForm();
      setDrawerOpen(false);
      await refreshProducts();
      router.push(`/master/products/${created.id}`);
    } catch (error) {
      const msg = (error as Error).message;
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.warn("[products] Create failed:", { payload, error: msg });
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Choose a CSV file to import first.");
      return;
    }
    setImporting(true);
    try {
      const result = await importProductsApi(importFile);
      setImportResult(result);
      const skippedCount = result.skipped?.length ?? 0;
      const created = result.created ?? result.imported;
      const updated = result.updated ?? 0;
      if (skippedCount > 0) {
        toast.warning(
          `Imported ${result.imported} (${created} new, ${updated} updated). ${skippedCount} row${skippedCount === 1 ? "" : "s"} skipped.`
        );
      } else {
        toast.success(
          `Imported ${result.imported} product${result.imported === 1 ? "" : "s"} (${created} new, ${updated} updated).`
        );
      }
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setListCursor("0");
      setListCursorStack([]);
      await refreshProducts();
      void loadCategories();
      void loadFamilies();
      // Keep the sheet open only if there is a report worth reading.
      if (skippedCount === 0 && (result.warnings?.length ?? 0) === 0) {
        setImportOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  // Product type option cards for the create drawer
  const typeOptions: Array<{ value: "RAW" | "FINISHED" | "BOTH"; label: string; description: string; color: string; icon: keyof typeof Icons }> = [
    {
      value: "RAW",
      label: "Purchased product",
      description: "Buy from suppliers. Appears on purchase orders and bills.",
      color: "border-blue-500/40 bg-blue-500/5 data-[active=true]:border-blue-500 data-[active=true]:bg-blue-500/10",
      icon: "ShoppingCart",
    },
    {
      value: "FINISHED",
      label: "Finished product",
      description: "Sell to customers. Appears on sales orders and invoices.",
      color: "border-green-500/40 bg-green-500/5 data-[active=true]:border-green-500 data-[active=true]:bg-green-500/10",
      icon: "TrendingUp",
    },
    {
      value: "BOTH",
      label: "Stock product",
      description: "Buy and sell. Appears on both purchase and sales documents.",
      color: "border-purple-500/40 bg-purple-500/5 data-[active=true]:border-purple-500 data-[active=true]:bg-purple-500/10",
      icon: "Package",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title={productLabel + "s"}
        description="Manage your product catalogue, pricing and variants"
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: productLabel + "s" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => exportProductsCsvApi((msg) => toast.error(msg))}
            >
              <Icons.Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => { setImportFile(null); setImportResult(null); setImportOpen(true); }}
            >
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setDrawerOpen(true);
              }}
              data-tour-step="create-button"
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add {productLabel}
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by SKU, name, category..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All", value: "" },
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ],
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
            {
              id: "productType",
              label: "Type",
              options: [
                { label: "All types", value: "" },
                { label: "Purchased product", value: "RAW" },
                { label: "Finished product", value: "FINISHED" },
                { label: "Stock product", value: "BOTH" },
              ],
              value: productTypeFilter,
              onChange: (v) => setProductTypeFilter(v as "RAW" | "FINISHED" | "BOTH" | ""),
            },
            {
              id: "category",
              label: "Category",
              options: [
                { label: "All categories", value: "" },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ],
              value: categoryFilter,
              onChange: (v) => setCategoryFilter(v),
            },
            {
              id: "family",
              label: "Product family",
              options: [
                { label: "All families", value: "" },
                ...families.map((f) => ({ label: f, value: f })),
              ],
              value: familyFilter,
              onChange: (v) => setFamilyFilter(v),
            },
          ]}
        />
        {!hasLoadedOnce ? (
          <div className="relative overflow-hidden rounded-lg border">
            <TopProgressBar active />
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded bg-muted/60" />
              ))}
            </div>
          </div>
        ) : !loading && allRows.length === 0 ? (
          <EmptyState
            icon={productIcon}
            title={`No ${productLabel.toLowerCase()}s found`}
            description="Add your first product or adjust filters."
            action={{
              label: `Add ${productLabel}`,
              onClick: () => setDrawerOpen(true),
            }}
          />
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <TopProgressBar active={loading} />
              <DataTable<ProductRow>
                data={allRows}
                columns={columns}
                onRowClick={(row) => router.push(`/master/products/${row.id}`)}
                emptyMessage={loading ? "Searching…" : `No ${productLabel.toLowerCase()}s.`}
                className={cn(
                  "transition-opacity duration-200",
                  loading && "opacity-60",
                )}
              />
            </div>

            {/* Pagination — below the table */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {allRows.length} product{allRows.length === 1 ? "" : "s"}
                {debouncedSearch.trim() ? ` matching “${debouncedSearch.trim()}”` : ""}
                {listCursorStack.length > 0 ? ` · page ${listCursorStack.length + 1}` : ""}
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs">Show</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-[72px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs">per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || listCursorStack.length === 0}
                    onClick={() => {
                      const stack = [...listCursorStack];
                      const prev = stack.pop()!;
                      setListCursorStack(stack);
                      setListCursor(prev);
                    }}
                  >
                    <Icons.ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || !listHasMore || !listNextCursor}
                    onClick={() => {
                      if (!listNextCursor) return;
                      setListCursorStack((s) => [...s, listCursor]);
                      setListCursor(listNextCursor);
                    }}
                  >
                    Next
                    <Icons.ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create drawer ────────────────────────────────────────────────── */}
      <EntityDrawer
        open={drawerOpen}
        onOpenChange={(o) => { if (!o) resetForm(); setDrawerOpen(o); }}
        title={`New ${productLabel}`}
        description={step === 1 ? "Step 1 of 2 — Product identity" : "Step 2 of 2 — Classification (optional)"}
        mode="create"
        footer={
          step === 1 ? (
            <>
              <Button variant="outline" onClick={() => { resetForm(); setDrawerOpen(false); }}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!sku.trim() || !name.trim()}
              >
                Next
                <Icons.ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create & configure"}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4 pr-4">
          {step === 1 ? (
            <>
              {/* SKU */}
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  placeholder="e.g. SKU-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-suggested. Edit if needed.
                </p>
              </div>
              {/* Product code */}
              <div className="space-y-2">
                <Label>Product code</Label>
                <Input
                  placeholder="00001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-suggested. Edit if needed.
                </p>
              </div>
              {/* Name */}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Product name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {/* Base UOM */}
              <div className="space-y-2">
                <Label>Base unit of measure</Label>
                <Select
                  value={unit || (uomOptions[0] ?? "EA")}
                  onValueChange={(v) => setUnit(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {uomOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Product type visual selector */}
              <div className="space-y-2">
                <Label>Product type</Label>
                <div className="space-y-2">
                  {typeOptions.map((opt) => {
                    const Icon = Icons[opt.icon] as React.FC<{ className?: string }>;
                    const isActive = productType === opt.value || (!productType && opt.value === "BOTH");
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        data-active={isActive}
                        className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${opt.color} ${isActive ? "ring-1 ring-offset-0" : ""}`}
                        onClick={() => setProductType(opt.value)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                          </div>
                          {isActive && (
                            <Icons.CheckCircle2 className="ml-auto h-4 w-4 shrink-0 opacity-80" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product family (optional)</Label>
                <Input
                  placeholder="e.g. Tilapia, Nile Perch — groups SKUs in pickers"
                  value={productFamily}
                  onChange={(e) => setProductFamily(e.target.value)}
                  list="product-family-suggestions"
                />
                <datalist id="product-family-suggestions">
                  {existingProductFamilies.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Used for document lines and stock views (Product → SKU). Leave blank if not needed.
                </p>
              </div>
              {/* Category — Add category available to any authenticated user (no role-specific permission) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Category (optional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setNewCategoryCode(""); setNewCategoryName(""); setAddCategoryOpen(true); }}
                  >
                    <Icons.Plus className="h-3.5 w-3.5 mr-1" />
                    Add category
                  </Button>
                </div>
                <Select
                  value={categoryId || "__none__"}
                  onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Default tax code */}
              <div className="space-y-2">
                <Label>Default tax code (optional)</Label>
                <Select
                  value={defaultTaxCodeId || "__none__"}
                  onValueChange={(v) => setDefaultTaxCodeId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {taxCodes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.code} — {t.name} ({t.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-applied when this product is added to a sales or purchase document.
                </p>
              </div>
            </>
          )}
        </div>
      </EntityDrawer>

      {/* Add category sheet */}
      <Sheet open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add category</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="e.g. FISH"
                value={newCategoryCode}
                onChange={(e) => setNewCategoryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24))}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Fish & Seafood"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
            <Button
              disabled={!newCategoryCode.trim() || !newCategoryName.trim() || addingCategory}
              onClick={async () => {
                if (!newCategoryCode.trim() || !newCategoryName.trim()) return;
                setAddingCategory(true);
                try {
                  const { id } = await createProductCategoryApi({
                    code: newCategoryCode.trim(),
                    name: newCategoryName.trim(),
                  });
                  setCategories((prev) => [...prev, { id, code: newCategoryCode.trim(), name: newCategoryName.trim() }]);
                  setCategoryId(id);
                  setAddCategoryOpen(false);
                  setNewCategoryCode("");
                  setNewCategoryName("");
                  toast.success("Category added.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to add category.");
                } finally { setAddingCategory(false); }
              }}
            >
              {addingCategory ? "Adding..." : "Add"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteConfirmProductId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmProductId(null); }}
        title="Delete product?"
        description="This will remove the product permanently. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteConfirmProductId) return;
          try {
            await deleteProductApi(deleteConfirmProductId);
            toast.success("Product deleted.");
            setDeleteConfirmProductId(null);
            await refreshProducts();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Delete failed.";
            toast.error(
              message.includes("403") || message.toLowerCase().includes("permission")
                ? "You need admin.settings permission to delete products. Deactivating the product also removes it from price lists."
                : message
            );
          }
        }}
      />

      {/* ── Bulk import sheet ─────────────────────────────────────────────── */}
      <Sheet open={importOpen} onOpenChange={(o) => { if (!o) { setImportFile(null); setImportResult(null); } setImportOpen(o); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import {productLabel.toLowerCase()}s</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Columns</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><span className="font-medium text-foreground">code</span> <span className="text-red-500">(required)</span> — each product&apos;s unique identity, like a barcode. Numbers (<code>00001</code>) or text (<code>FISH-TIL</code>) both work. No two products can share it.</li>
                <li><span className="font-medium text-foreground">name</span> <span className="text-red-500">(required)</span> — the product name.</li>
                <li><span className="font-medium text-foreground">baseUom</span> — base unit of measure the product is tracked in (KG, EA, L…). Defaults to EA.</li>
                <li><span className="font-medium text-foreground">productType</span> — <code>Purchased product</code> (buy), <code>Finished product</code> (sell) or <code>Stock product</code> (buy &amp; sell).</li>
                <li><span className="font-medium text-foreground">category</span> — optional group name (e.g. <code>Fish</code>). Created automatically if it&apos;s new.</li>
                <li><span className="font-medium text-foreground">productFamily</span> — optional. Groups related SKUs together (e.g. <code>Tilapia</code> for whole + fillet). Leave blank to skip; edit later per product.</li>
              </ul>
              <p className="pt-1">Upload the same <span className="font-medium text-foreground">code</span> again to update that product instead of creating a duplicate. No price needed — set prices via price lists.</p>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-3">
              <div className="flex items-center gap-2 text-sm">
                <Icons.FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Need the format?</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadProductsTemplateCsv()}
              >
                <Icons.Download className="mr-2 h-3.5 w-3.5" />
                Template
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMPORT}
              className="hidden"
              onChange={(e) => pickImportFile(e.target.files?.[0] ?? null)}
            />

            {/* Drag & drop zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickImportFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              {importFile ? (
                <div className="flex flex-col items-center gap-1">
                  <Icons.FileCheck2 className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB · click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Icons.UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Drag &amp; drop your file here</p>
                  <p className="text-xs text-muted-foreground">or click to browse · CSV, XLSX or XLS</p>
                </div>
              )}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Excel files are converted automatically — no need to save as CSV first.
            </p>

            {importResult && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium text-foreground">
                  Result: {importResult.imported} imported
                  {typeof importResult.created === "number" ? ` · ${importResult.created} new` : ""}
                  {typeof importResult.updated === "number" ? ` · ${importResult.updated} updated` : ""}
                </p>
                {(importResult.categoriesCreated?.length ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Created {importResult.categoriesCreated!.length} new categor{importResult.categoriesCreated!.length === 1 ? "y" : "ies"}: {importResult.categoriesCreated!.join(", ")}
                  </p>
                )}
                {(importResult.skipped?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-red-600">{importResult.skipped!.length} skipped</p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                      {importResult.skipped!.map((s, idx) => (
                        <li key={idx}>Row {s.row}{s.code ? ` (${s.code})` : ""}: {s.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(importResult.warnings?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-amber-600">{importResult.warnings!.length} warning{importResult.warnings!.length === 1 ? "" : "s"}</p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                      {importResult.warnings!.map((w, idx) => (
                        <li key={idx}>Row {w.row}{w.code ? ` (${w.code})` : ""}: {w.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setImportFile(null); setImportResult(null); setImportOpen(false); }}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            <Button disabled={!importFile || importing} onClick={() => void handleImport()}>
              {importing ? "Importing..." : importResult ? "Import again" : "Import"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
