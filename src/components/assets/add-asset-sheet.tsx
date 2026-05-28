"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ASSET_CATEGORIES,
  assetFormFromRow,
  defaultAnnualDepreciationRatePct,
  emptyAssetForm,
  parseOptionalInt,
  parseOptionalRate,
  type AssetForm,
} from "@/components/assets/asset-form-constants";
import { assignAssetCustodyApi, createAssetApi, updateAssetApi } from "@/lib/api/assets";
import type { AssetRow, DepreciationMethod } from "@/lib/types/assets";
import { toast } from "sonner";

export function AddAssetSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: AssetRow | null;
  suggestedCode?: string;
  assignToOutletId?: string;
  assignToOutletName?: string;
  /** When false (default for register), show full depreciation and vendor fields. */
  compact?: boolean;
  suppliers?: Array<{ id: string; name: string }>;
  onSuccess?: () => void | Promise<void>;
}) {
  const {
    open,
    onOpenChange,
    editing = null,
    suggestedCode,
    assignToOutletId,
    assignToOutletName,
    compact: compactProp,
    suppliers = [],
    onSuccess,
  } = props;

  const compact = compactProp ?? Boolean(assignToOutletId && !editing);
  const [form, setForm] = React.useState<AssetForm>(() => emptyAssetForm());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm(assetFormFromRow(editing));
      return;
    }
    const base = emptyAssetForm();
    setForm({ ...base, code: suggestedCode ?? base.code });
  }, [open, editing, suggestedCode]);

  const buildPatchBody = () => {
    if (form.depreciationMethod === "REDUCING_BALANCE") {
      const rr = parseOptionalRate(form.depreciationRatePct);
      if (rr == null || rr <= 0) {
        throw new Error("Enter a positive annual depreciation % when using reducing balance.");
      }
    }
    const usefulLifeMonths = parseOptionalInt(form.usefulLifeMonths);
    const depreciationRatePct = parseOptionalRate(form.depreciationRatePct);
    return {
      code: form.code,
      name: form.name,
      category: form.category,
      branchId: form.branchId || undefined,
      serialNumber: form.serialNumber || undefined,
      assetTag: form.assetTag || undefined,
      model: form.model || undefined,
      inServiceDate: form.inServiceDate || undefined,
      acquisitionDate: form.acquisitionDate,
      cost: form.cost,
      salvage: form.salvage,
      usefulLifeYears: form.usefulLifeYears,
      usefulLifeMonths,
      depreciationMethod: form.depreciationMethod,
      depreciationRatePct: form.depreciationMethod === "REDUCING_BALANCE" ? depreciationRatePct : undefined,
      linkedVendorId: form.linkedVendorId || undefined,
      linkedInvoiceId: form.linkedInvoiceId || undefined,
    };
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const patchBody = buildPatchBody();
      if (editing) {
        await updateAssetApi(editing.id, patchBody);
        toast.success("Asset updated.");
      } else {
        const { id } = await createAssetApi({ ...patchBody, status: "ACTIVE" });
        if (assignToOutletId) {
          await assignAssetCustodyApi(id, {
            custodyType: "FRANCHISE_OUTLET",
            custodianOutletId: assignToOutletId,
            effectiveFrom: form.acquisitionDate,
            currency: "KES",
          });
          toast.success("Equipment added and assigned to outlet.");
        } else {
          toast.success("Asset created.");
        }
      }
      onOpenChange(false);
      await onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const sheetTitle = editing ? "Edit asset" : assignToOutletId ? "Add equipment" : "Add asset";
  const sheetDescription = editing
    ? "Update financial master record."
    : assignToOutletId
      ? `Creates an HQ asset and assigns custody to ${assignToOutletName ?? "this outlet"}.`
      : "Financial master record — use the asset detail page to transfer custody.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {!compact && (
            <div className="space-y-2">
              <Label>Code</Label>
              {!editing && (
                <p className="text-xs text-muted-foreground">
                  Next available code ({form.code}). Editable after the asset exists.
                </p>
              )}
              <Input
                readOnly={!editing}
                className={!editing ? "bg-muted/50" : undefined}
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="FA-001"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Asset name"
            />
          </div>
          {!compact && (
            <div className="space-y-2">
              <Label>Branch ID (optional)</Label>
              <Input
                value={form.branchId}
                onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                placeholder="Branch document id"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Serial</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Asset tag</Label>
              <Input
                value={form.assetTag}
                onChange={(e) => setForm((p) => ({ ...p, assetTag: e.target.value }))}
              />
            </div>
          </div>
          {!compact && (
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  category: v,
                  depreciationRatePct: String(defaultAnnualDepreciationRatePct(v)),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                Default reducing-balance depreciation: Vehicles 25% per year; IT Equipment, Machinery, Furniture,
                and Other 10% per year.
              </p>
            )}
          </div>
          {!compact && (
            <div className="space-y-2">
              <Label>In-service date (optional)</Label>
              <Input
                type="date"
                value={form.inServiceDate}
                onChange={(e) => setForm((p) => ({ ...p, inServiceDate: e.target.value }))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Acquisition date</Label>
            <Input
              type="date"
              value={form.acquisitionDate}
              onChange={(e) => setForm((p) => ({ ...p, acquisitionDate: e.target.value }))}
            />
          </div>
          <div className={compact ? "space-y-2" : "grid grid-cols-2 gap-4"}>
            <div className="space-y-2">
              <Label>Cost</Label>
              <Input
                type="number"
                value={form.cost || ""}
                onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            {!compact && (
              <div className="space-y-2">
                <Label>Salvage</Label>
                <Input
                  type="number"
                  value={form.salvage || ""}
                  onChange={(e) => setForm((p) => ({ ...p, salvage: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            )}
          </div>
          {!compact && (
            <>
              <div className="space-y-2">
                <Label>Useful life (years)</Label>
                <Input
                  type="number"
                  value={form.usefulLifeYears || ""}
                  onChange={(e) => setForm((p) => ({ ...p, usefulLifeYears: Number(e.target.value) || 0 }))}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label>Useful life (months override, optional)</Label>
                <Input
                  type="number"
                  value={form.usefulLifeMonths}
                  onChange={(e) => setForm((p) => ({ ...p, usefulLifeMonths: e.target.value }))}
                  placeholder="e.g. 36 — else years × 12"
                />
              </div>
              <div className="space-y-2">
                <Label>Depreciation method</Label>
                <Select
                  value={form.depreciationMethod}
                  onValueChange={(v) => setForm((p) => ({ ...p, depreciationMethod: v as DepreciationMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRAIGHT_LINE">Straight-line</SelectItem>
                    <SelectItem value="REDUCING_BALANCE">Reducing balance</SelectItem>
                  </SelectContent>
                </Select>
                {form.depreciationMethod === "STRAIGHT_LINE" && (
                  <p className="text-xs text-muted-foreground">
                    Straight-line uses cost, salvage value, and useful life only (annual % below is ignored).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Annual depreciation % (for reducing balance)</Label>
                <Input
                  type="number"
                  disabled={form.depreciationMethod !== "REDUCING_BALANCE"}
                  value={form.depreciationRatePct}
                  onChange={(e) => setForm((p) => ({ ...p, depreciationRatePct: e.target.value }))}
                  placeholder="e.g. 25"
                />
              </div>
              {suppliers.length > 0 && (
                <div className="space-y-2">
                  <Label>Linked vendor</Label>
                  <Select
                    value={form.linkedVendorId}
                    onValueChange={(v) => setForm((p) => ({ ...p, linkedVendorId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Linked invoice</Label>
                <Input
                  value={form.linkedInvoiceId}
                  onChange={(e) => setForm((p) => ({ ...p, linkedInvoiceId: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </>
          )}
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : assignToOutletId ? "Add & assign" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
