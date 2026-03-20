"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchCustomerCategoriesApi,
  createCustomerCategoryApi,
  updateCustomerCategoryApi,
  type CustomerCategoryRow,
} from "@/lib/api/customer-categories";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CustomerCategoriesPage() {
  const [categories, setCategories] = React.useState<CustomerCategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomerCategoryRow | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchCustomerCategoriesApi();
      setCategories(items);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (row: CustomerCategoryRow) => { setEditing(row); setSheetOpen(true); };

  const handleSave = async (values: { code: string; name: string; description: string; isActive: boolean }) => {
    try {
      if (editing) {
        await updateCustomerCategoryApi(editing.id, {
          name: values.name,
          description: values.description || undefined,
          isActive: values.isActive,
        });
        toast.success("Category updated.");
      } else {
        await createCustomerCategoryApi({
          code: values.code,
          name: values.name,
          description: values.description || undefined,
        });
        toast.success("Category created.");
      }
      setSheetOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message ?? "Save failed");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Customer categories"
        description="Segment customers into categories for pricing, credit policy, and reporting."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Customer categories" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={openAdd}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add category
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No customer categories yet. Add one above to assign to customers.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-mono font-medium">{cat.code}</TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.description ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={cat.isActive ? "secondary" : "outline"}>
                          {cat.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {sheetOpen && (
        <CategorySheet
          initial={editing}
          onSave={handleSave}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </PageShell>
  );
}

function CategorySheet({
  initial,
  onSave,
  onClose,
}: {
  initial: CustomerCategoryRow | null;
  onSave: (v: { code: string; name: string; description: string; isActive: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) { toast.error("Code and name are required."); return; }
    setSaving(true);
    try {
      await onSave({ code: code.trim().toUpperCase(), name: name.trim(), description: description.trim(), isActive });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit category" : "Add category"}</SheetTitle>
          <SheetDescription>
            Customer categories help group accounts for pricing rules, credit policies, and reporting.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. RETAIL"
              disabled={!!initial}
            />
            {!!initial && (
              <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retail" />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
          </div>
          {!!initial && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !code.trim() || !name.trim()}>
            {saving ? "Saving…" : initial ? "Update" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
