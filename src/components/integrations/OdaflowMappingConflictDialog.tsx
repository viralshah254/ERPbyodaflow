"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OdaflowErmLookupMapping } from "@/lib/api/odaflow-integration";
import { sfaProductKindLabel } from "@/lib/odaflow-mapping-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "product" | "customer";
  erpLabel: string;
  odaflowLabel: string;
  odaflowPackSize?: string;
  existingMappings: OdaflowErmLookupMapping[];
  productConflictReason?: "same_catalog" | "size_mismatch";
  onConfirmLink: () => void;
  onSearchAgain: () => void;
  onCreateNew?: () => void;
};

function formatSfaProductLabel(name: string, packSize?: string) {
  const trimmed = name.trim();
  if (packSize?.trim()) return `${trimmed} · ${packSize.trim()}`;
  return trimmed;
}

function formatExistingMapping(mapping: OdaflowErmLookupMapping) {
  const kind = sfaProductKindLabel(mapping.sfaProductKind);
  const base =
    mapping.displayLabel ??
    (mapping.odaflowName
      ? formatSfaProductLabel(mapping.odaflowName, mapping.odaflowPackSize)
      : mapping.externalId);
  return kind ? `${base} (${kind})` : base;
}

export function OdaflowMappingConflictDialog({
  open,
  onOpenChange,
  kind,
  erpLabel,
  odaflowLabel,
  odaflowPackSize,
  existingMappings,
  productConflictReason,
  onConfirmLink,
  onSearchAgain,
  onCreateNew,
}: Props) {
  const entityWord = kind === "product" ? "product" : "customer";
  const orderLineLabel = formatSfaProductLabel(odaflowLabel, odaflowPackSize);
  const existingLabel =
    existingMappings.length === 1
      ? formatExistingMapping(existingMappings[0]!)
      : existingMappings.map(formatExistingMapping).join(", ");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[80] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg rounded-lg"
          )}
        >
          <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
            <Icons.Link2 className="h-4 w-4 text-amber-600 shrink-0" />
            {kind === "product"
              ? "This ERP product is already matched in Odaflow"
              : "This ERP customer is already matched in Odaflow"}
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {kind === "product" ? (
                <>
                  <p>
                    Your order line{" "}
                    <span className="font-medium text-foreground">{orderLineLabel}</span> is being linked to ERP product{" "}
                    <span className="font-medium text-foreground">{erpLabel}</span>.
                  </p>
                  {productConflictReason === "same_catalog" ? (
                    <>
                      <p>
                        That ERP product is already linked to another{" "}
                        {sfaProductKindLabel(
                          existingMappings.find((m) => m.sfaProductKind)?.sfaProductKind
                        ) ?? "SFA"}{" "}
                        product:{" "}
                        <span className="font-medium text-foreground">{existingLabel}</span>. Only one SFA product per
                        catalog (Modern Trade or General Trade) can map to each ERP SKU.
                      </p>
                      <p>Search for the correct ERP product, or create one if this size is missing from your catalog.</p>
                    </>
                  ) : (
                    <>
                      <p>
                        That ERP product is already matched to a different Odaflow SFA size:{" "}
                        <span className="font-medium text-foreground">{existingLabel}</span>. Each size needs its own
                        ERP product.
                      </p>
                      <p>
                        Modern Trade and General Trade can share one ERP SKU when the size matches, but you cannot link
                        two different sizes to the same ERP product.
                      </p>
                    </>
                  )}
                  <p>Are you sure you want to override the saved match?</p>
                </>
              ) : (
                <>
                  <p>
                    <span className="font-medium text-foreground">{erpLabel}</span> is already matched to Odaflow SFA
                    customer <span className="font-medium text-foreground">{existingLabel}</span>.
                  </p>
                  <p>
                    You are linking order customer{" "}
                    <span className="font-medium text-foreground">{orderLineLabel}</span> to the same ERP customer.
                    Search for the correct ERP customer, or create one if this account is missing.
                  </p>
                  <p>Are you sure you want to change the saved match for future orders?</p>
                </>
              )}
            </div>
          </Dialog.Description>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onSearchAgain();
                onOpenChange(false);
              }}
            >
              Search again
            </Button>
            {onCreateNew ? (
              <Button type="button" variant="outline" onClick={onCreateNew}>
                <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
                Create new ERP {entityWord}
                {kind === "product" ? " — missing from catalog" : ""}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                onConfirmLink();
                onOpenChange(false);
              }}
            >
              Change mapping anyway
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
