"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchProductPackagingApi,
  saveProductPackagingApi,
} from "@/lib/api/product-master";
import type { ProductPackaging } from "@/lib/products/pricing-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUGGESTED_UOMS = ["CARTON", "OUTER", "BALE", "BOX", "PACK", "DOZEN"] as const;

export function AddPackUomDialog({
  open,
  onOpenChange,
  productId,
  productName,
  baseUom = "PCS",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
  baseUom?: string;
  onSaved: (items: ProductPackaging[], uom: string) => void;
}) {
  const [uom, setUom] = React.useState("");
  const [units, setUnits] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setUom("");
      setUnits("");
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    const nextUom = uom.trim().toUpperCase();
    const unitsPer = Number(units);
    if (!nextUom) {
      toast.error("Enter a pack name (CARTON, OUTER, BALE).");
      return;
    }
    if (!Number.isFinite(unitsPer) || unitsPer <= 1) {
      toast.error("Pieces per pack must be greater than 1.");
      return;
    }

    setSaving(true);
    try {
      const existing = await fetchProductPackagingApi(productId);
      const piece = baseUom.trim().toUpperCase() || "PCS";
      const kept = existing.filter((item) => item.uom.trim().toUpperCase() !== nextUom);
      const items: ProductPackaging[] = [
        ...kept,
        {
          uom: nextUom,
          unitsPer,
          baseUom: piece,
          factor: unitsPer,
          referenceUom: piece,
        },
      ];
      await saveProductPackagingApi(productId, items);
      toast.success(`1 ${nextUom} = ${unitsPer} ${piece} saved on SKU master.`);
      onSaved(items, nextUom);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this pack.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg",
          )}
        >
          <Dialog.Title className="text-lg font-semibold">Add pack UOM</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {productName
              ? `How many ${baseUom} are in one pack of ${productName}?`
              : `How many ${baseUom} are in this pack?`}
          </Dialog.Description>
          <div className="mt-4 grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-pack-uom" className="text-xs">
                Pack name
              </Label>
              <Input
                id="add-pack-uom"
                list="add-pack-uom-suggestions"
                className="h-9 font-mono uppercase"
                value={uom}
                autoFocus
                disabled={saving}
                placeholder="CARTON"
                onChange={(e) => setUom(e.target.value.toUpperCase())}
              />
              <datalist id="add-pack-uom-suggestions">
                {SUGGESTED_UOMS.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-pack-units" className="text-xs">
                Pieces per pack
              </Label>
              <Input
                id="add-pack-units"
                type="number"
                min={2}
                className="h-9"
                value={units}
                disabled={saving}
                placeholder="24"
                onChange={(e) => setUnits(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSave();
                  }
                }}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save pack"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
