"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OdaflowErmLookupMapping } from "@/lib/api/odaflow-integration";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "product" | "customer";
  erpLabel: string;
  odaflowLabel: string;
  odaflowExternalId?: string;
  existingMappings: OdaflowErmLookupMapping[];
  onConfirmLink: () => void;
  onSearchAgain: () => void;
  onCreateNew?: () => void;
};

function formatMappingLabel(mapping: OdaflowErmLookupMapping) {
  const parts = [mapping.externalId];
  if (mapping.externalKey && mapping.externalKey !== mapping.externalId) {
    parts.push(`key ${mapping.externalKey}`);
  }
  return parts.join(" · ");
}

export function OdaflowMappingConflictDialog({
  open,
  onOpenChange,
  kind,
  erpLabel,
  odaflowLabel,
  odaflowExternalId,
  existingMappings,
  onConfirmLink,
  onSearchAgain,
  onCreateNew,
}: Props) {
  const entityWord = kind === "product" ? "product" : "customer";

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
            This ERP {entityWord} is already linked in Odaflow
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{erpLabel}</span> is already matched to these Odaflow SFA{" "}
                {kind === "product" ? "products" : "customers"}:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {existingMappings.map((mapping) => (
                  <li key={`${mapping.externalId}:${mapping.externalKey ?? ""}`} className="text-foreground">
                    {formatMappingLabel(mapping)}
                  </li>
                ))}
              </ul>
              <p>
                You are linking Odaflow {entityWord}{" "}
                <span className="font-medium text-foreground">{odaflowLabel}</span>
                {odaflowExternalId ? (
                  <>
                    {" "}
                    (<span className="font-mono text-xs">{odaflowExternalId}</span>)
                  </>
                ) : null}{" "}
                to the same ERP {entityWord}. Several SFA {entityWord}s can share one ERP {entityWord} — confirm you
                want to save this match for future orders.
              </p>
            </div>
          </Dialog.Description>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              onClick={() => {
                onConfirmLink();
                onOpenChange(false);
              }}
            >
              Link and remember for future orders
            </Button>
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
              <Button type="button" variant="ghost" onClick={onCreateNew}>
                <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
                Create new ERP {entityWord}
              </Button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
