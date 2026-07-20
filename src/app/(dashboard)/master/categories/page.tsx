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
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  createProductCategoryApi,
  deleteProductCategoryApi,
  fetchProductCategoriesApi,
  normalizeCategoryCode,
  suggestCategoryCodeFromName,
  updateProductCategoryApi,
  type ItemCategoryRow,
} from "@/lib/api/product-categories";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function MasterCategoriesPage() {
  const canWrite = useCanWriteInventory();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [rows, setRows] = React.useState<ItemCategoryRow[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [softLoading, setSoftLoading] = React.useState(false);
  const [softFiltering, setSoftFiltering] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [codeManual, setCodeManual] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", code: "" });
  const hasLoadedOnceRef = React.useRef(false);

  const reload = React.useCallback(async () => {
    if (hasLoadedOnceRef.current) setSoftLoading(true);
    try {
      setRows(await fetchProductCategoriesApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load categories.");
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
      (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [rows, debouncedSearch]);

  const showSoftProgress = softLoading || softFiltering;

  const deleteTarget = deleteId ? rows.find((r) => r.id === deleteId) : undefined;

  const openCreate = () => {
    setEditingId(null);
    setCodeManual(false);
    setForm({ name: "", code: "" });
    setDrawerOpen(true);
  };

  const openEdit = (row: ItemCategoryRow) => {
    setEditingId(row.id);
    setCodeManual(true);
    setForm({ name: row.name, code: row.code });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      const code =
        normalizeCategoryCode(form.code, 32, { trimEnds: true }) ||
        suggestCategoryCodeFromName(form.name, existingCodes);
      if (editingId) {
        await updateProductCategoryApi(editingId, {
          name: form.name.trim(),
          code,
        });
        toast.success("Category updated. Product lists show the new name automatically.");
      } else {
        await createProductCategoryApi({
          name: form.name.trim(),
          code,
        });
        toast.success("Category created.");
      }
      setDrawerOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const result = await deleteProductCategoryApi(deleteId);
      const n = result.detachedProducts ?? 0;
      toast.success(
        n > 0
          ? `Category deleted. ${n} product${n === 1 ? "" : "s"} unassigned.`
          : "Category deleted."
      );
      setDeleteId(null);
      if (editingId === deleteId) setDrawerOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category.");
    } finally {
      setSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Category",
        accessor: (r: ItemCategoryRow) => <span className="font-medium">{r.name}</span>,
        sticky: true,
      },
      {
        id: "code",
        header: "Code",
        accessor: (r: ItemCategoryRow) => (
          <span className="font-mono text-muted-foreground">{r.code}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: ItemCategoryRow) => (
          <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              accessor: (r: ItemCategoryRow) => (
                <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <RowActions
                    actions={[
                      {
                        label: "Edit",
                        icon: "Pencil" as const,
                        onClick: () => openEdit(r),
                      },
                      {
                        label: "Delete",
                        icon: "Trash2" as const,
                        onClick: () => setDeleteId(r.id),
                        variant: "destructive" as const,
                      },
                    ]}
                  />
                </div>
              ),
              className: "w-[50px]",
            },
          ]
        : []),
    ],
    [canWrite]
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Categories"
        description="Group products. Renaming updates every product that uses the category."
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: "Categories" },
        ]}
        sticky
        showCommandHint
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          ) : undefined
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar
          searchPlaceholder="Search by name or code…"
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
            icon="Tags"
            title="No categories"
            description="Create categories to group products (e.g. Beverages, Edible Oils)."
            action={
              canWrite
                ? {
                    label: "Add category",
                    onClick: openCreate,
                  }
                : undefined
            }
          />
        ) : (
          <div className="relative min-h-0 flex-1">
            <TopProgressBar active={showSoftProgress} />
            <DataTable<ItemCategoryRow>
              data={filtered}
              columns={columns}
              onRowClick={canWrite ? openEdit : undefined}
              emptyMessage={
                debouncedSearch.trim()
                  ? `No categories match “${debouncedSearch.trim()}”.`
                  : "No categories."
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
        title={editingId ? "Edit category" : "New category"}
        description={
          editingId
            ? "Rename updates the label on all products that use this category."
            : "Add a category you can assign when creating or editing products."
        }
        mode={editingId ? "edit" : "create"}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editingId && canWrite ? (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteId(editingId)}
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
                    : suggestCategoryCodeFromName(name, existingCodes),
                }));
              }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Code (optional)</Label>
              {codeManual ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setCodeManual(false);
                    setForm((current) => ({
                      ...current,
                      code: suggestCategoryCodeFromName(current.name, existingCodes),
                    }));
                  }}
                >
                  Use auto
                </Button>
              ) : null}
            </div>
            <Input
              placeholder="e.g. 0008 or BEV-01"
              value={form.code}
              onChange={(event) => {
                // Any edit (including clear) stays manual so auto does not fight the user.
                setCodeManual(true);
                setForm((current) => ({
                  ...current,
                  code: normalizeCategoryCode(event.target.value, 32, { trimEnds: false }),
                }));
              }}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {codeManual
                ? "Your code — letters, digits, - and _ (e.g. 0008). Leave blank to auto on save."
                : "Filled from the name. Edit anytime to type your own (e.g. 0008)."}
            </p>
          </div>
        </div>
      </EntityDrawer>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete category?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Products that used it keep the SKU — they are only unassigned from this category.`
            : "Products that used this category will be unassigned."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleDelete()}
      />
    </PageShell>
  );
}
