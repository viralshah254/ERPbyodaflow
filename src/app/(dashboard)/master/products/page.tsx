"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { createProductApi, fetchProductSkusApi, fetchProductCodesApi, fetchProductsApi, deleteProductApi } from "@/lib/api/products";
import { fetchProductCategoriesApi, createProductCategoryApi } from "@/lib/api/product-categories";
import { fetchProductUomsApi } from "@/lib/api/uom";
import { setProductsCache } from "@/lib/data/products.repo";
import type { ProductRow } from "@/lib/types/masters";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const productIcon = "Package" as const;

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

type ProductType = "RAW" | "FINISHED" | "BOTH" | undefined;

function productTypeLabel(type: ProductType | string | undefined): string {
  if (type === "RAW") return "Purchased item";
  if (type === "FINISHED") return "Sellable item";
  if (type === "BOTH") return "Stock item";
  return "Stock item";
}

function ProductTypeBadge({ type }: { type: ProductType | string | undefined }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const label = productTypeLabel(type);
  const cls =
    type === "RAW"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
      : type === "FINISHED"
      ? "border-green-500/30 bg-green-500/10 text-green-400"
      : "border-purple-500/30 bg-purple-500/10 text-purple-400";
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

export default function MasterProductsPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const permissions = useAuthStore((s) => s.permissions);
  const canDeleteProduct = permissions.includes("admin.settings");
  const productLabel = t("product", terminology);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"RAW" | "FINISHED" | "BOTH" | "">("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [allRows, setAllRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Step 1 fields
  const [step, setStep] = React.useState<1 | 2>(1);
  const [sku, setSku] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [productType, setProductType] = React.useState<"RAW" | "FINISHED" | "BOTH" | "">("");
  const [categoryId, setCategoryId] = React.useState("");
  const [unit, setUnit] = React.useState("");

  const [categories, setCategories] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [deleteConfirmProductId, setDeleteConfirmProductId] = React.useState<string | null>(null);
  const [newCategoryCode, setNewCategoryCode] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [uomOptions, setUomOptions] = React.useState<string[]>([]);

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

  React.useEffect(() => { void loadCategories(); }, [loadCategories]);
  React.useEffect(() => { void loadUoms(); }, [loadUoms]);

  const refreshProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProductsApi({
        search: search || undefined,
        status: statusFilter || undefined,
        productType: productTypeFilter || undefined,
      });
      setAllRows(data);
      setProductsCache(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, productTypeFilter]);

  React.useEffect(() => { void refreshProducts(); }, [refreshProducts]);

  React.useEffect(() => {
    if (drawerOpen) {
      fetchProductSkusApi()
        .then((skus) => setSku(suggestNextSku(skus)))
        .catch(() => {});
      fetchProductCodesApi()
        .then((codes) => setCode(suggestNextCode(codes)))
        .catch(() => setCode("00001"));
    }
  }, [drawerOpen]);

  const categoryNameById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

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
      { id: "name", header: "Name", accessor: "name" as keyof ProductRow },
      {
        id: "category",
        header: "Category",
        accessor: (r: ProductRow) =>
          r.category ? categoryNameById.get(r.category) ?? r.category : "—",
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
    setProductType("");
    setUnit("");
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
      category: categoryId.trim() || undefined,
      productType: productType || undefined,
      unit: selectedUnit,
      baseUom: selectedUnit,
      status: "ACTIVE" as const,
    };
    try {
      const created = await createProductApi(payload);
      toast.success(`${productTypeLabel(productType)} created.`);
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

  // Product type option cards for the create drawer
  const typeOptions: Array<{ value: "RAW" | "FINISHED" | "BOTH"; label: string; description: string; color: string; icon: keyof typeof Icons }> = [
    {
      value: "RAW",
      label: "Purchased item",
      description: "Buy from suppliers. Appears on purchase orders and bills.",
      color: "border-blue-500/40 bg-blue-500/5 data-[active=true]:border-blue-500 data-[active=true]:bg-blue-500/10",
      icon: "ShoppingCart",
    },
    {
      value: "FINISHED",
      label: "Sellable item",
      description: "Sell to customers. Appears on sales orders and invoices.",
      color: "border-green-500/40 bg-green-500/5 data-[active=true]:border-green-500 data-[active=true]:bg-green-500/10",
      icon: "TrendingUp",
    },
    {
      value: "BOTH",
      label: "Stock item",
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
                { label: "Purchased item", value: "RAW" },
                { label: "Sellable item", value: "FINISHED" },
                { label: "Stock item", value: "BOTH" },
              ],
              value: productTypeFilter,
              onChange: (v) => setProductTypeFilter(v as "RAW" | "FINISHED" | "BOTH" | ""),
            },
          ]}
        />
        {loading ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading {productLabel.toLowerCase()}s...
          </div>
        ) : allRows.length === 0 ? (
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
          <DataTable<ProductRow>
            data={allRows}
            columns={columns}
            onRowClick={(row) => router.push(`/master/products/${row.id}`)}
            emptyMessage={`No ${productLabel.toLowerCase()}s.`}
          />
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
              {/* Category */}
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
            toast.error((err as Error).message);
          }
        }}
      />
    </PageShell>
  );
}
