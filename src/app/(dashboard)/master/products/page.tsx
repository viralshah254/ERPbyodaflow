"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  fetchProductCategoriesApi,
  createProductCategoryApi,
  normalizeCategoryCode,
  suggestCategoryCodeFromName,
} from "@/lib/api/product-categories";
import { fetchProductDepartmentsApi } from "@/lib/api/product-departments";
import { fetchProductUomsApi } from "@/lib/api/uom";
import { fetchFinancialTaxesApi } from "@/lib/api/financial-taxes";
import type { TaxRow } from "@/lib/types/taxes";
import { setProductsCache } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import { productTypeLabel } from "@/lib/products/product-type";
import { composeFmcgSize, FMCG_SIZE_UOMS } from "@/lib/products/fmcg-size";
import { ProductTypeBadge } from "@/components/products/ProductTypeBadge";
import { t } from "@/lib/terminology";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { isSeafoodOrg } from "@/config/industry";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const productIcon = "Package" as const;
const PRODUCTS_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

/** Next sequential SKU (SKU-001, SKU-002…). Ignores barcode-style SKUs. */
function suggestNextSku(existing: string[]): string {
  const numbers = existing
    .map((s) => {
      const m = s.trim().match(/^SKU-(\d+)$/i);
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
  const searchParams = useSearchParams();
  const terminology = useTerminology();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);
  const fmcgOrg = isFmcgOrg(templateId) || industryCategory === "FMCG";
  const permissions = useAuthStore((s) => s.permissions);
  const canDeleteProduct = permissions.includes("admin.settings");
  const canWriteProduct = permissions.includes("inventory.write") || permissions.includes("admin.settings") || permissions.includes("*");
  const productLabel = t("product", terminology);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"RAW" | "FINISHED" | "BOTH" | "">("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");
  const [departments, setDepartments] = React.useState<Array<{ id: string; name: string }>>([]);
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
  const [barcode, setBarcode] = React.useState("");
  /** Seafood / legacy free-text size; FMCG uses sizeValue + sizeUom → composed `size`. */
  const [size, setSize] = React.useState("");
  const [sizeValue, setSizeValue] = React.useState("");
  const [sizeUom, setSizeUom] = React.useState<string>("g");
  const [name, setName] = React.useState("");
  const [productType, setProductType] = React.useState<"RAW" | "FINISHED" | "BOTH" | "">("");
  const [categoryId, setCategoryId] = React.useState("");
  const [productFamily, setProductFamily] = React.useState("");
  /** Stock / packing unit (PCS, CARTON…). Not size UOM (g, ml…). */
  const [unit, setUnit] = React.useState("");

  const [taxCodes, setTaxCodes] = React.useState<TaxRow[]>([]);
  const [defaultTaxCodeId, setDefaultTaxCodeId] = React.useState("");
  const [categories, setCategories] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [deleteConfirmProductId, setDeleteConfirmProductId] = React.useState<string | null>(null);
  const [newCategoryCode, setNewCategoryCode] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  /** When false, code tracks name automatically; flip true once the user edits code. */
  const [categoryCodeManual, setCategoryCodeManual] = React.useState(false);
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [uomOptions, setUomOptions] = React.useState<string[]>([]);

  // Bulk import / export
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportProductsResult | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Deep-link from Pricing empty state: /master/products?import=1
  React.useEffect(() => {
    if (searchParams.get("import") === "1" && canWriteProduct) {
      setImportFile(null);
      setImportResult(null);
      setImportOpen(true);
    }
  }, [searchParams, canWriteProduct]);

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

  const loadDepartments = React.useCallback(async () => {
    if (!fmcgOrg) {
      setDepartments([]);
      return;
    }
    try {
      const list = await fetchProductDepartmentsApi();
      setDepartments(list.filter((d) => d.isActive).map((d) => ({ id: d.id, name: d.name })));
    } catch {
      setDepartments([]);
    }
  }, [fmcgOrg]);

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
  React.useEffect(() => { void loadDepartments(); }, [loadDepartments]);
  React.useEffect(() => { void loadUoms(); }, [loadUoms]);
  React.useEffect(() => { void loadFamilies(); }, [loadFamilies]);

  React.useEffect(() => {
    setListCursor("0");
    setListCursorStack([]);
    setListNextCursor(null);
  }, [debouncedSearch, statusFilter, productTypeFilter, categoryFilter, departmentFilter, familyFilter, pageSize]);

  const refreshProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchProductsPageApi({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        productType: productTypeFilter || undefined,
        categoryId: categoryFilter || undefined,
        departmentId: departmentFilter || undefined,
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
  }, [debouncedSearch, statusFilter, productTypeFilter, categoryFilter, departmentFilter, familyFilter, listCursor, pageSize]);

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
      ...(fmcgOrg
        ? [
            {
              id: "name",
              header: "Product name",
              accessor: "name" as keyof ProductRow,
              sticky: true,
            },
            {
              id: "barcode",
              header: "Barcode",
              accessor: (r: ProductRow) =>
                r.barcode ? (
                  <span className="font-mono text-xs font-medium">{r.barcode}</span>
                ) : (
                  "—"
                ),
            },
            {
              id: "category",
              header: "Category",
              accessor: (r: ProductRow) =>
                r.categoryName ??
                (r.category ? categoryNameById.get(r.category) : undefined) ??
                "—",
            },
            {
              id: "size",
              header: "Size",
              accessor: (r: ProductRow) => r.size?.trim() || "—",
            },
            {
              id: "sku",
              header: "SKU",
              accessor: (r: ProductRow) => (
                <span className="font-mono text-muted-foreground">{r.sku}</span>
              ),
            },
          ]
        : [
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
            { id: "name", header: "Name", accessor: "name" as keyof ProductRow },
            {
              id: "barcode",
              header: "Barcode",
              accessor: (r: ProductRow) =>
                r.barcode ? <span className="font-mono text-xs">{r.barcode}</span> : "—",
            },
            ...(seafoodOrg
              ? [
                  {
                    id: "productFamily",
                    header: "Product family",
                    accessor: (r: ProductRow) => r.productFamily?.trim() || "—",
                  },
                ]
              : [
                  {
                    id: "size",
                    header: "Size",
                    accessor: (r: ProductRow) => r.size?.trim() || "—",
                  },
                ]),
            {
              id: "category",
              header: "Category",
              accessor: (r: ProductRow) =>
                r.categoryName ??
                (r.category ? categoryNameById.get(r.category) : undefined) ??
                "—",
            },
          ]),
      {
        id: "productType",
        header: "Type",
        accessor: (r: ProductRow) => <ProductTypeBadge type={r.productType} />,
      },
      // FMCG sells finished packs by barcode — packing UOM is not a list concern.
      ...(!fmcgOrg
        ? [
            {
              id: "unit",
              header: !seafoodOrg ? "Packing" : "Unit",
              accessor: "unit" as keyof ProductRow,
            },
          ]
        : []),
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
    [categoryNameById, router, canDeleteProduct, fmcgOrg, seafoodOrg]
  );

  const resetForm = () => {
    setStep(1);
    setSku("");
    setCode("");
    setBarcode("");
    setSize("");
    setSizeValue("");
    setSizeUom("g");
    setName("");
    setCategoryId("");
    setProductFamily("");
    setProductType(fmcgOrg ? "FINISHED" : "");
    setUnit(fmcgOrg ? "PCS" : "");
    setDefaultTaxCodeId("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    const trimmedBarcode = barcode.trim();
    if (fmcgOrg && !trimmedBarcode) {
      toast.error("Barcode is required — it is the product code on the pack.");
      return;
    }
    setSaving(true);
    let trimmedSku = sku.trim();
    try {
      const freshSkus = await fetchProductSkusApi();
      // Auto-generate if the field was cleared.
      if (!trimmedSku) {
        trimmedSku = suggestNextSku(freshSkus);
        setSku(trimmedSku);
      }
      if (freshSkus.some((s) => s.toLowerCase() === trimmedSku.toLowerCase())) {
        toast.error("This SKU is already in use.");
        setSaving(false);
        return;
      }
    } catch {
      setSaving(false);
      return;
    }
    // FMCG create stays pricing-focused; packing defaults to PCS (refine on packaging tab).
    const selectedUnit = fmcgOrg ? "PCS" : unit.trim() || (uomOptions[0] ?? "EA");
    const composedSize = fmcgOrg
      ? composeFmcgSize(sizeValue, sizeUom)
      : size.trim() || undefined;
    // FMCG: product code = barcode (trade identity). Seafood keeps separate product code.
    const resolvedCode = fmcgOrg
      ? trimmedBarcode || trimmedSku
      : code.trim() || undefined;
    const payload = {
      sku: trimmedSku,
      code: resolvedCode,
      barcode: trimmedBarcode || undefined,
      size: composedSize,
      name: name.trim(),
      productFamily: seafoodOrg ? productFamily.trim() || undefined : undefined,
      category: categoryId.trim() || undefined,
      productType: productType || (fmcgOrg ? "FINISHED" : undefined),
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
        description={
          fmcgOrg
            ? "Product catalogue — name, barcode (product code), size, category. Set piece prices on Price tags."
            : "Manage your product catalogue, pricing and variants"
        }
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: productLabel + "s" },
        ]}
        sticky
        showCommandHint
        actions={canWriteProduct ? (
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
        ) : undefined
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
            ...(fmcgOrg
              ? [
                  {
                    id: "department",
                    label: "Department",
                    options: [
                      { label: "All departments", value: "" },
                      ...departments.map((d) => ({ label: d.name, value: d.id })),
                    ],
                    value: departmentFilter,
                    onChange: (v: string) => setDepartmentFilter(v),
                  },
                ]
              : []),
            ...(seafoodOrg
              ? [
                  {
                    id: "family",
                    label: "Product family",
                    options: [
                      { label: "All families", value: "" },
                      ...families.map((f) => ({ label: f, value: f })),
                    ],
                    value: familyFilter,
                    onChange: (v: string) => setFamilyFilter(v),
                  },
                ]
              : []),
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
            description={canWriteProduct ? "Add your first product or adjust filters." : "No products match your filters."}
            action={canWriteProduct ? {
              label: `Add ${productLabel}`,
              onClick: () => setDrawerOpen(true),
            } : undefined}
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
        description={
          fmcgOrg
            ? "Name, barcode (product code), size. Category optional."
            : step === 1
              ? "Step 1 of 2 — Product identity"
              : "Step 2 of 2 — Classification (optional)"
        }
        mode="create"
        footer={
          fmcgOrg ? (
            <>
              <Button variant="outline" onClick={() => { resetForm(); setDrawerOpen(false); }}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={saving || !name.trim() || !barcode.trim()}
              >
                {saving ? "Creating..." : "Create"}
              </Button>
            </>
          ) : step === 1 ? (
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
        <form
          className="space-y-4 pr-4"
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
        >
          {fmcgOrg ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-name">Product name</Label>
                  <Input
                    id="erp-product-name"
                    name="erp-product-name"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="e.g. BEEF MASALA 50GM (POUCH)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Full product description shown on lists and documents.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-barcode">
                    Barcode <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="erp-product-barcode"
                    name="erp-product-barcode"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    inputMode="numeric"
                    placeholder="e.g. 6161105846376"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required. The product code on the pack (EAN/UPC) — the main trade identifier.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-sku">SKU</Label>
                  <Input
                    id="erp-product-sku"
                    name="erp-product-sku"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="e.g. SKU-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated. Edit if you prefer your own code.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <div className="grid grid-cols-[1fr_7rem] gap-2">
                    <Input
                      inputMode="decimal"
                      placeholder="e.g. 50 or 100"
                      value={sizeValue}
                      onChange={(e) => setSizeValue(e.target.value)}
                    />
                    <Select value={sizeUom} onValueChange={setSizeUom}>
                      <SelectTrigger>
                        <SelectValue placeholder="UOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {FMCG_SIZE_UOMS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preview:{" "}
                    <span className="font-medium text-foreground">
                      {composeFmcgSize(sizeValue, sizeUom) || "—"}
                    </span>
                    {" "}(e.g. 50g, 100g, 2L).
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Category (optional)</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <Link href="/master/categories">Manage</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setNewCategoryCode("");
                          setNewCategoryName("");
                          setCategoryCodeManual(false);
                          setAddCategoryOpen(true);
                        }}
                      >
                        <Icons.Plus className="h-3.5 w-3.5 mr-1" />
                        Add category
                      </Button>
                    </div>
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
                  <p className="text-xs text-muted-foreground">
                    Optional grouping (e.g. Beverages, Edible Oils). Leave as None if not needed.
                  </p>
                </div>
              </>
          ) : step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-sku">SKU</Label>
                  <Input
                    id="erp-product-sku"
                    name="erp-product-sku"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="e.g. SKU-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Auto-suggested. Edit if needed.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-code">Product code</Label>
                  <Input
                    id="erp-product-code"
                    name="erp-product-code"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="00001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Auto-suggested. Edit if needed.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-barcode">Barcode</Label>
                  <Input
                    id="erp-product-barcode"
                    name="erp-product-barcode"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="EAN / UPC (optional)"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erp-product-name">Product name</Label>
                  <Input
                    id="erp-product-name"
                    name="erp-product-name"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="Product name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
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
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
          ) : (
            <>
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
              {seafoodOrg ? (
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
                    CoolCatch species / line grouping. Leave blank if not needed.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Category (optional)</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <Link href="/master/categories">Manage</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setNewCategoryCode("");
                        setNewCategoryName("");
                        setCategoryCodeManual(false);
                        setAddCategoryOpen(true);
                      }}
                    >
                      <Icons.Plus className="h-3.5 w-3.5 mr-1" />
                      Add category
                    </Button>
                  </div>
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
        </form>
      </EntityDrawer>

      {/* Add category sheet */}
      <Sheet
        open={addCategoryOpen}
        onOpenChange={(o) => {
          if (!o) {
            setNewCategoryCode("");
            setNewCategoryName("");
            setCategoryCodeManual(false);
          }
          setAddCategoryOpen(o);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add category</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder={fmcgOrg ? "e.g. Beverages" : "e.g. Fish & Seafood"}
                value={newCategoryName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setNewCategoryName(nextName);
                  if (!categoryCodeManual) {
                    setNewCategoryCode(
                      suggestCategoryCodeFromName(
                        nextName,
                        categories.map((c) => c.code)
                      )
                    );
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Code (optional)</Label>
                {categoryCodeManual ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCategoryCodeManual(false);
                      setNewCategoryCode(
                        suggestCategoryCodeFromName(
                          newCategoryName,
                          categories.map((c) => c.code)
                        )
                      );
                    }}
                  >
                    Use auto
                  </Button>
                ) : null}
              </div>
              <Input
                placeholder={fmcgOrg ? "e.g. 0008 or BEV-01" : "e.g. 0008 or FISH-01"}
                value={newCategoryCode}
                onChange={(e) => {
                  // Any edit (including clear) stays manual so auto does not fight the user.
                  setCategoryCodeManual(true);
                  setNewCategoryCode(
                    normalizeCategoryCode(e.target.value, 32, { trimEnds: false })
                  );
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {categoryCodeManual
                  ? "Your code — letters, digits, - and _ (e.g. 0008). Leave blank to auto on Add."
                  : "Auto-filled from the name. Edit anytime to type your own (e.g. 0008)."}
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddCategoryOpen(false);
                setNewCategoryCode("");
                setNewCategoryName("");
                setCategoryCodeManual(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!newCategoryName.trim() || addingCategory}
              onClick={async () => {
                const nameTrim = newCategoryName.trim();
                if (!nameTrim) return;
                const codeTrim =
                  normalizeCategoryCode(newCategoryCode, 32, { trimEnds: true }) ||
                  suggestCategoryCodeFromName(
                    nameTrim,
                    categories.map((c) => c.code)
                  );
                setAddingCategory(true);
                try {
                  const { id } = await createProductCategoryApi({
                    code: codeTrim,
                    name: nameTrim,
                  });
                  setCategories((prev) => [...prev, { id, code: codeTrim, name: nameTrim }]);
                  setCategoryId(id);
                  setAddCategoryOpen(false);
                  setNewCategoryCode("");
                  setNewCategoryName("");
                  setCategoryCodeManual(false);
                  toast.success("Category added.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to add category.");
                } finally {
                  setAddingCategory(false);
                }
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
              {fmcgOrg ? (
                <ul className="list-disc pl-4 space-y-1">
                  <li><span className="font-medium text-foreground">name</span> <span className="text-red-500">(required)</span> — product name / description.</li>
                  <li><span className="font-medium text-foreground">barcode</span> <span className="text-red-500">(required)</span> — product code on the pack (EAN), e.g. <code>6161105846376</code>.</li>
                  <li><span className="font-medium text-foreground">sku</span> — optional; auto-generated as <code>SKU-001</code> if omitted.</li>
                  <li><span className="font-medium text-foreground">size</span> — e.g. <code>50g</code>, <code>100g</code>, <code>2L</code>.</li>
                  <li><span className="font-medium text-foreground">baseUom</span> — packing: <code>PCS</code>, <code>CARTON</code>, <code>OUTER</code>, etc.</li>
                  <li><span className="font-medium text-foreground">category</span> — optional; created if new.</li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-1">
                  <li><span className="font-medium text-foreground">code</span> <span className="text-red-500">(required)</span> — unique identity. Numbers (<code>00001</code>) or text (<code>FISH-TIL</code>).</li>
                  <li><span className="font-medium text-foreground">name</span> <span className="text-red-500">(required)</span> — the product name.</li>
                  <li><span className="font-medium text-foreground">baseUom</span> — KG, EA, L… Defaults to EA.</li>
                  <li><span className="font-medium text-foreground">productType</span> — Purchased / Finished / Stock product.</li>
                  <li><span className="font-medium text-foreground">category</span> — optional (e.g. Fish).</li>
                  <li><span className="font-medium text-foreground">productFamily</span> — optional CoolCatch line (e.g. Tilapia).</li>
                </ul>
              )}
              <p className="pt-1">
                Re-upload the same <span className="font-medium text-foreground">code</span> to update.
                {fmcgOrg ? " Set piece prices on Price tags after import." : " No price needed — set prices via price lists."}
              </p>
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
                onClick={() => downloadProductsTemplateCsv({ fmcg: fmcgOrg })}
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
