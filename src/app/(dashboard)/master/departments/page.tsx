"use client";

import * as React from "react";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  fetchProductCategoriesApi,
  type ItemCategoryRow,
} from "@/lib/api/product-categories";
import {
  createProductDepartmentApi,
  deleteProductDepartmentApi,
  fetchProductDepartmentsApi,
  updateProductDepartmentApi,
  type ProductDepartmentRow,
} from "@/lib/api/product-departments";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function suggestDepartmentCodeFromName(name: string, existingCodes: string[]): string {
  const raw = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const base = raw || "DEPT";
  const used = new Set(existingCodes.map((c) => c.toUpperCase()));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`) && n < 100) n += 1;
  return `${base}_${n}`;
}

export default function MasterDepartmentsPage() {
  const canWrite = useCanWriteInventory();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [rows, setRows] = React.useState<ProductDepartmentRow[]>([]);
  const [categories, setCategories] = React.useState<ItemCategoryRow[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [softLoading, setSoftLoading] = React.useState(false);
  const [softFiltering, setSoftFiltering] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [codeManual, setCodeManual] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    code: "",
    categoryIds: [] as string[],
  });
  const [categorySearch, setCategorySearch] = React.useState("");
  const hasLoadedOnceRef = React.useRef(false);

  const reload = React.useCallback(async () => {
    if (hasLoadedOnceRef.current) setSoftLoading(true);
    try {
      const [departments, categoryItems] = await Promise.all([
        fetchProductDepartmentsApi(),
        fetchProductCategoriesApi(),
      ]);
      setRows(departments);
      setCategories(categoryItems.filter((c) => c.isActive));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load departments.");
    } finally {
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
      setSoftLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!hasLoadedOnce) {
      setDebouncedSearch(search);
      return;
    }
    setSoftFiltering(true);
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setSoftFiltering(false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [search, hasLoadedOnce]);

  const existingCodes = React.useMemo(
    () => rows.filter((r) => r.id !== editingId).map((r) => r.code),
    [rows, editingId]
  );

  const filtered = React.useMemo(() => {
    if (!debouncedSearch.trim()) return rows;
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.categories.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [rows, debouncedSearch]);

  const showSoftProgress = softLoading || softFiltering;

  const visibleCategories = React.useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [categories, categorySearch]);

  const openCreate = () => {
    setEditingId(null);
    setCodeManual(false);
    setCategorySearch("");
    setForm({ name: "", code: "", categoryIds: [] });
    setDrawerOpen(true);
  };

  const openEdit = (row: ProductDepartmentRow) => {
    setEditingId(row.id);
    setCodeManual(true);
    setCategorySearch("");
    setForm({
      name: row.name,
      code: row.code,
      categoryIds: [...row.categoryIds],
    });
    setDrawerOpen(true);
  };

  const toggleCategory = (id: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      categoryIds: checked
        ? [...current.categoryIds, id]
        : current.categoryIds.filter((x) => x !== id),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Department name is required.");
      return;
    }
    setSaving(true);
    try {
      const code = form.code.trim()
        ? form.code.trim().toUpperCase()
        : suggestDepartmentCodeFromName(form.name, existingCodes);
      const payload = {
        name: form.name.trim(),
        code,
        categoryIds: form.categoryIds,
      };
      if (editingId) {
        await updateProductDepartmentApi(editingId, payload);
        toast.success("Department updated.");
      } else {
        await createProductDepartmentApi(payload);
        toast.success("Department created.");
      }
      setDrawerOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm("Delete this department? Categories stay; they are only unassigned.")) {
      return;
    }
    setSaving(true);
    try {
      await deleteProductDepartmentApi(editingId);
      toast.success("Department deleted.");
      setDrawerOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete department.");
    } finally {
      setSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Department",
        accessor: (r: ProductDepartmentRow) => (
          <span className="font-medium">{r.name}</span>
        ),
        sticky: true,
      },
      {
        id: "code",
        header: "Code",
        accessor: (r: ProductDepartmentRow) => (
          <span className="text-muted-foreground">{r.code}</span>
        ),
      },
      {
        id: "categories",
        header: "Categories",
        accessor: (r: ProductDepartmentRow) => {
          if (r.categories.length === 0) {
            return <span className="text-muted-foreground">None</span>;
          }
          const labels = r.categories.map((c) => c.name);
          const shown = labels.slice(0, 3).join(", ");
          const more = labels.length > 3 ? ` +${labels.length - 3}` : "";
          return (
            <span title={labels.join(", ")}>
              {shown}
              {more}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: ProductDepartmentRow) => (
          <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
      },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Departments"
        description="Group product categories into departments for reporting and filters"
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: "Departments" },
        ]}
        sticky
        showCommandHint
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add department
            </Button>
          ) : undefined
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar
          searchPlaceholder="Search by name, code, category…"
          searchValue={search}
          onSearchChange={setSearch}
        />
        {!hasLoadedOnce ? (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
            <TopProgressBar active />
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="Layers"
            title="No departments"
            description="Create a department and assign product categories to it."
            action={
              canWrite
                ? {
                    label: "Add department",
                    onClick: openCreate,
                  }
                : undefined
            }
          />
        ) : (
          <div className="relative min-h-0 flex-1">
            <TopProgressBar active={showSoftProgress} />
            <DataTable<ProductDepartmentRow>
              data={filtered}
              columns={columns}
              onRowClick={canWrite ? openEdit : undefined}
              emptyMessage={
                debouncedSearch.trim()
                  ? `No departments match “${debouncedSearch.trim()}”.`
                  : "No departments."
              }
              scrollMode="fill"
              size="comfortable"
              className={cn(
                "min-h-0 flex-1 border-0 transition-opacity duration-200",
                showSoftProgress && "opacity-60",
              )}
            />
          </div>
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? "Edit department" : "New department"}
        description="Departments group many categories. Products inherit a department through their category."
        mode={editingId ? "edit" : "create"}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editingId && canWrite ? (
                <Button
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  disabled={saving}
                >
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:space-x-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Beverages"
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                setForm((current) => ({
                  ...current,
                  name,
                  code: codeManual
                    ? current.code
                    : suggestDepartmentCodeFromName(name, existingCodes),
                }));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Code (optional)</Label>
            <Input
              placeholder="Auto from name"
              value={form.code}
              onChange={(event) => {
                setCodeManual(true);
                setForm((current) => ({ ...current, code: event.target.value }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              {codeManual
                ? "Manual code. Clear and retype the name to auto-suggest again."
                : "Filled from the name. Edit to override."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Categories</Label>
            <Input
              placeholder="Search categories…"
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
              {categories.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  No categories yet. Create categories on Products first.
                </p>
              ) : visibleCategories.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">No matching categories.</p>
              ) : (
                visibleCategories.map((category) => {
                  const checked = form.categoryIds.includes(category.id);
                  const assignedElsewhere =
                    Boolean(category.departmentId) &&
                    category.departmentId !== editingId &&
                    !checked;
                  const otherDept = assignedElsewhere
                    ? rows.find((d) => d.id === category.departmentId)
                    : undefined;
                  return (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1.5 hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleCategory(category.id, value === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">{category.name}</span>
                        <span className="ml-1.5 text-muted-foreground">{category.code}</span>
                        {otherDept ? (
                          <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
                            Currently in {otherDept.name} — selecting moves it here
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {form.categoryIds.length} selected
            </p>
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
