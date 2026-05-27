"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ZonePriceCascadeConflict } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";

function conflictKey(c: ZonePriceCascadeConflict): string {
  return `${c.outletListId}:${c.productId}`;
}

function fmtPrice(n: number, currency: string): string {
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type ZonePriceCascadeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ZonePriceCascadeConflict[];
  currency: string;
  applying?: boolean;
  onApplySelected: (selected: ZonePriceCascadeConflict[]) => void | Promise<void>;
  onKeepAll: () => void;
};

export function ZonePriceCascadeDialog({
  open,
  onOpenChange,
  conflicts,
  currency,
  applying = false,
  onApplySelected,
  onKeepAll,
}: ZonePriceCascadeDialogProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, conflicts]);

  const toggle = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(conflicts.map(conflictKey)));
  };

  const clearAll = () => setSelected(new Set());

  const selectedConflicts = conflicts.filter((c) => selected.has(conflictKey(c)));

  const handleApply = () => {
    void onApplySelected(selectedConflicts);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex max-h-[85vh] w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-hidden border bg-background p-6 shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg"
          )}
        >
          <div className="space-y-1 shrink-0">
            <Dialog.Title className="text-lg font-semibold">Update outlet overrides?</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              These outlets have custom prices for SKUs you changed on the zone master. Apply removes
              the override so they use the new zone price.
            </Dialog.Description>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={applying}>
              Apply all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={applying}>
              Clear all
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {selected.size} of {conflicts.length} selected
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Apply</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>SKU / Product</TableHead>
                  <TableHead className="text-right">Custom price</TableHead>
                  <TableHead className="text-right">New zone price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((c) => {
                  const key = conflictKey(c);
                  const checked = selected.has(key);
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggle(key, v === true)}
                          disabled={applying}
                          aria-label={`Apply zone price for ${c.productName} at ${c.outletName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.outletName}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{c.sku}</span>
                        <span className="ml-2">{c.productName}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPrice(c.outletPrice, currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPrice(c.newZonePrice, currency)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 shrink-0 pt-2">
            <Button type="button" variant="outline" onClick={onKeepAll} disabled={applying}>
              Keep all custom
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={applying || selected.size === 0}
            >
              {applying ? "Applying…" : `Apply selected (${selected.size})`}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
