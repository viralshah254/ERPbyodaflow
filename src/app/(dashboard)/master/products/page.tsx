"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
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
import { createProductApi, fetchProductsApi } from "@/lib/api/products";
import { fetchProductCategoriesApi, createProductCategoryApi } from "@/lib/api/product-categories";
import { setProductsCache } from "@/lib/data/products.repo";
import { listUoms } from "@/lib/data/uom.repo";
import type { ProductRow } from "@/lib/types/masters";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const productIcon = "Package" as const;

export default function MasterProductsPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const productLabel = t("product", terminology);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [allRows, setAllRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [baseBarcode, setBaseBarcode] = React.useState("");
  const [defaultSize, setDefaultSize] = React.useState("");
  const [categories, setCategories] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [newCategoryCode, setNewCategoryCode] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [addingCategory, setAddingCategory] = React.useState(false);

  const uomOptions = React.useMemo(() => listUoms().map((u) => u.code), []);

  const loadCategories = React.useCallback(async () => {
    try {
      const list = await fetchProductCategoriesApi();
      setCategories(list.filter((c) => c.isActive).map((c) => ({ id: c.id, code: c.code, name: c.name })));
    } catch {
      setCategories([]);
    }
  }, []);

  React.useEffect(() => {
    void loadCategories();
  }, [loadCategories]);
  const filtered = allRows;

  const refreshProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProductsApi(search, statusFilter || undefined);
      setAllRows(data);
      setProductsCache(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const categoryNameById = React.useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const columns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: ProductRow) => <span className="font-medium">{r.sku}</span>,
        sticky: true,
      },
      { id: "name", header: "Name", accessor: "name" as keyof ProductRow },
      {
        id: "category",
        header: "Category",
        accessor: (r: ProductRow) => (r.category ? categoryNameById.get(r.category) ?? r.category : "—"),
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
    ],
    [categoryNameById]
  );

  const resetForm = () => {
    setSku("");
    setName("");
    setCategoryId("");
    setUnit("");
    setBaseBarcode("");
    setDefaultSize("");
  };

  const handleCreate = async () => {
    if (!sku.trim() || !name.trim()) {
      toast.error("SKU and Name are required.");
      return;
    }
    const selectedUnit = unit.trim() || (uomOptions[0] ?? "EA");
    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      category: categoryId.trim() || undefined,
      unit: selectedUnit,
      baseUom: selectedUnit,
      status: "ACTIVE" as const,
    };
    try {
      setSaving(true);
      const created = await createProductApi(payload);
      toast.success("Product created.");
      resetForm();
      setDrawerOpen(false);
      await refreshProducts();
      router.push(`/master/products/${created.id}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={productLabel + "s"}
        description="Manage products and SKUs"
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: productLabel + "s" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setDrawerOpen(true);
            }}
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
          ]}
        />
        {loading ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading {productLabel.toLowerCase()}s...
          </div>
        ) : filtered.length === 0 ? (
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
            data={filtered}
            columns={columns}
            onRowClick={(row) => router.push(`/master/products/${row.id}`)}
            emptyMessage={`No ${productLabel.toLowerCase()}s.`}
          />
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? `Edit ${productLabel}` : `New ${productLabel}`}
        description={editingId ? "Update product details." : "Add a new product."}
        mode={editingId ? "edit" : "create"}
        footer={
          <>
            <Button variant="outline" onClick={() => { setDrawerOpen(false); }}>
              Cancel
            </Button>
            {!editingId && (
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create & configure"}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input
              placeholder="e.g. SKU-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setNewCategoryCode("");
                  setNewCategoryName("");
                  setAddCategoryOpen(true);
                }}
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
                <SelectValue placeholder="Select category" />
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
            <Label>Unit</Label>
            <Select
              value={unit || (uomOptions[0] ?? "EA")}
              onValueChange={(v) => setUnit(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {uomOptions.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base barcode (optional)</Label>
            <Input
              placeholder="Primary barcode used for base UOM"
              value={baseBarcode}
              onChange={(e) => setBaseBarcode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Default size / variant hint (optional)</Label>
            <Input
              placeholder="e.g. 1kg, 500ml"
              value={defaultSize}
              onChange={(e) => setDefaultSize(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is a hint for the first variant you will set up on the Variants tab.
            </p>
          </div>
        </div>
      </EntityDrawer>

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
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>
              Cancel
            </Button>
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
    </PageShell>
  );
}
