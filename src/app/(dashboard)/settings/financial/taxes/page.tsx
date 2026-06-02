"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createFinancialTaxApi,
  fetchFinancialTaxesApi,
  updateFinancialTaxApi,
  deleteFinancialTaxApi,
} from "@/lib/api/financial-taxes";
import type { TaxRow } from "@/lib/types/taxes";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function TaxesSettingsPage() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaxRow | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    rate: 0,
    inclusive: false,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "" as string | null,
  });

  const [rows, setRows] = React.useState<TaxRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const refreshRows = React.useCallback(async () => {
    const items = await fetchFinancialTaxesApi();
    setRows(items);
  }, []);

  React.useEffect(() => {
    void refreshRows()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load tax codes.");
      })
      .finally(() => setLoading(false));
  }, [refreshRows]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateFinancialTaxApi(editing.id, {
          code: form.code.trim(),
          name: form.name.trim(),
          rate: form.rate,
        });
        toast.success("Tax code updated.");
      } else {
        await createFinancialTaxApi({
          code: form.code.trim(),
          name: form.name.trim(),
          rate: form.rate,
          type: "VAT",
        });
        toast.success("Tax code created.");
      }
      await refreshRows();
      setDrawerOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tax code.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await deleteFinancialTaxApi(editing.id);
      await refreshRows();
      setDeleteConfirmOpen(false);
      setDrawerOpen(false);
      toast.success("Tax code deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tax code.");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      rate: 0,
      inclusive: false,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: null,
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: TaxRow) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      rate: row.rate,
      inclusive: row.inclusive,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? "",
    });
    setDrawerOpen(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Taxes"
        description="Tax codes: rate, inclusive/exclusive, effective dates"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Financial", href: "/settings/financial/currencies" },
          { label: "Taxes" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add tax code
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax codes</CardTitle>
            <CardDescription>
              Create and edit tax codes for documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>Inclusive</TableHead>
                  <TableHead>Effective from</TableHead>
                  <TableHead>Effective to</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-14" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                      No tax codes yet. Click &ldquo;Add tax code&rdquo; to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEdit(r)}
                    >
                      <TableCell className="font-medium">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.rate}</TableCell>
                      <TableCell>{r.inclusive ? "Yes" : "No"}</TableCell>
                      <TableCell>{r.effectiveFrom}</TableCell>
                      <TableCell>{r.effectiveTo ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(r);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit tax code" : "Add tax code"}</SheetTitle>
            <SheetDescription>
              Code, name, rate, inclusive/exclusive, effective dates.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="e.g. VAT16"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Tax name"
              />
            </div>
            <div className="space-y-2">
              <Label>Rate %</Label>
              <Input
                type="number"
                value={form.rate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="inclusive"
                checked={form.inclusive}
                onCheckedChange={(c) =>
                  setForm((p) => ({ ...p, inclusive: c === true }))
                }
              />
              <Label htmlFor="inclusive">Inclusive</Label>
            </div>
            <div className="space-y-2">
              <Label>Effective from</Label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective to (optional)</Label>
              <Input
                type="date"
                value={form.effectiveTo ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    effectiveTo: e.target.value || null,
                  }))
                }
              />
            </div>
          </div>
          <SheetFooter className="mt-6 sm:justify-between">
            {editing ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleting || saving}
              >
                <Icons.Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save" : "Create"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete tax code?"
        description={
          editing
            ? `This removes "${editing.code} — ${editing.name}". Products using it keep their stored reference but it will no longer be selectable. This cannot be undone.`
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageShell>
  );
}
