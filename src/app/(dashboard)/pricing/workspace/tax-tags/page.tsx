"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createTaxConfigApi,
  deleteTaxConfigApi,
  fetchTaxConfigsApi,
  updateTaxConfigApi,
  type TaxConfigRow,
} from "@/lib/api/pricing";
import { fetchFinancialTaxesApi } from "@/lib/api/financial-taxes";
import type { TaxRow } from "@/lib/types/taxes";
import { isApiConfigured } from "@/lib/api/client";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import Link from "next/link";

type FormState = {
  name: string;
  code: string;
  taxCodeId: string;
  pricesAreTaxInclusive: boolean;
  isDefault: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  code: "",
  taxCodeId: "",
  pricesAreTaxInclusive: false,
  isDefault: false,
});

export default function TaxTagsPage() {
  const templateId = useOrgContextStore((s) => s.templateId);
  const fmcg = isFmcgOrg(templateId);
  const [items, setItems] = React.useState<TaxConfigRow[]>([]);
  const [taxes, setTaxes] = React.useState<TaxRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaxConfigRow | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TaxConfigRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!isApiConfigured() || !fmcg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [configs, taxRows] = await Promise.all([fetchTaxConfigsApi(), fetchFinancialTaxesApi()]);
      setItems(configs);
      setTaxes(taxRows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fmcg]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditing(null);
    const vat16 = taxes.find((t) => t.code === "KE-VAT16") ?? taxes[0];
    setForm({
      ...emptyForm(),
      taxCodeId: vat16?.id ?? "",
      pricesAreTaxInclusive: false,
    });
    setSheetOpen(true);
  };

  const openEdit = (row: TaxConfigRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code ?? "",
      taxCodeId: row.taxCodeId,
      pricesAreTaxInclusive: row.pricesAreTaxInclusive,
      isDefault: row.isDefault,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.taxCodeId) {
      toast.error("Select a tax code (rate).");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTaxConfigApi(editing.id, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          taxCodeId: form.taxCodeId,
          pricesAreTaxInclusive: form.pricesAreTaxInclusive,
          isDefault: form.isDefault,
        });
        toast.success("Tax tag updated.");
      } else {
        await createTaxConfigApi({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          taxCodeId: form.taxCodeId,
          pricesAreTaxInclusive: form.pricesAreTaxInclusive,
          isDefault: form.isDefault,
        });
        toast.success("Tax tag created.");
      }
      setSheetOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaxConfigApi(deleteTarget.id);
      toast.success("Tax tag deleted.");
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (!fmcg) {
    return (
      <PageShell>
        <PageHeader title="Tax tags" description="Tax tags are available for FMCG organisations." />
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Seafood / CoolCatch orgs continue using tax codes and the tax-inclusive switch on documents.{" "}
            <Link href="/settings/financial/taxes" className="text-primary underline-offset-4 hover:underline">
              Open tax codes →
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Tax tags"
        description="Named VAT configurations for invoicing — pick exclusive or inclusive pricing, same idea as price tags."
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New tax tag
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exclusive vs inclusive</CardTitle>
          <CardDescription>
            Inclusive does not mean “has VAT”. Both tags can use 16% Kenya VAT. Exclusive adds VAT on top of
            the unit price (100 → 116). Inclusive means the selling price already includes VAT (116 → net 100,
            tax 16).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tax tags yet. Create one to use on sales orders and invoices.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tax code</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.isDefault ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Default
                        </Badge>
                      ) : null}
                      {row.code ? (
                        <span className="ml-2 text-xs text-muted-foreground">{row.code}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.taxCode || row.taxName || "—"}
                    </TableCell>
                    <TableCell>{row.rate}%</TableCell>
                    <TableCell>
                      {row.pricesAreTaxInclusive ? (
                        <Badge variant="outline">Inclusive</Badge>
                      ) : (
                        <Badge variant="outline">Exclusive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit tax tag" : "New tax tag"}</SheetTitle>
            <SheetDescription>
              Choose the VAT rate (tax code) and whether unit prices already include that tax.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. VAT 16% Exclusive"
              />
            </div>
            <div className="space-y-2">
              <Label>Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. VAT16-EXCL"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax code (rate)</Label>
              <Select
                value={form.taxCodeId || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, taxCodeId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tax code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {taxes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.code} — {t.name} ({t.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Manage rates under{" "}
                <Link href="/settings/financial/taxes" className="underline-offset-4 hover:underline">
                  Settings → Taxes
                </Link>
                .
              </p>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Prices are tax-inclusive</Label>
                <p className="text-xs text-muted-foreground">
                  Off = exclusive (VAT on top). On = inclusive (VAT inside the price).
                </p>
              </div>
              <Switch
                checked={form.pricesAreTaxInclusive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, pricesAreTaxInclusive: v }))}
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Org default</Label>
                <p className="text-xs text-muted-foreground">
                  Used when the customer has no tax tag of their own.
                </p>
              </div>
              <Switch
                checked={form.isDefault}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete tax tag?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? Documents already posted keep their tax amounts.`
            : undefined
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        variant="destructive"
        onConfirm={() => void handleDelete()}
      />
    </PageShell>
  );
}
