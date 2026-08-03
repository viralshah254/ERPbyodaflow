"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { patchDocumentApi } from "@/lib/api/documents";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  documentId: string;
  branchId?: string;
  warehouseId?: string;
  canEdit: boolean;
  compact?: boolean;
  onUpdated: () => void | Promise<void>;
};

export function DeliveryNoteWarehousePanel({
  documentId,
  branchId,
  warehouseId,
  canEdit,
  compact = false,
  onUpdated,
}: Props) {
  const [options, setOptions] = React.useState<LookupOption[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState(warehouseId ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSelectedId(warehouseId ?? "");
  }, [warehouseId]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    void fetchWarehouseOptions()
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const branchWarehouses = React.useMemo(() => {
    if (!branchId?.trim()) return options;
    const inBranch = options.filter((w) => w.branchId === branchId);
    return inBranch.length ? inBranch : options;
  }, [branchId, options]);

  const loadWarehouseOptions = React.useCallback(
    async (query: string) => {
      const q = query.trim().toLowerCase();
      const filtered = q
        ? branchWarehouses.filter((option) => option.label.toLowerCase().includes(q))
        : branchWarehouses;
      return filtered.map((option) => ({ id: option.id, label: option.label }));
    },
    [branchWarehouses]
  );

  const selectedWarehouseOption = React.useMemo(() => {
    if (!selectedId) return null;
    const match = options.find((o) => o.id === selectedId);
    return match ? { id: match.id, label: match.label } : { id: selectedId, label: selectedId };
  }, [options, selectedId]);

  const currentLabel = options.find((o) => o.id === warehouseId)?.label;
  const needsWarehouse = !warehouseId?.trim();
  const noWarehousesExist = !loadingOptions && options.length === 0;
  const dirty = selectedId.trim() !== (warehouseId ?? "").trim();

  async function handleSave() {
    if (!selectedId.trim()) {
      toast.error("Select a fulfilment warehouse.");
      return;
    }
    setSaving(true);
    try {
      const result = await patchDocumentApi("delivery-note", documentId, {
        warehouseId: selectedId,
      });
      toast.success("Fulfilment warehouse saved.");
      if (result.pickPackSyncWarning) toast.warning(result.pickPackSyncWarning);
      await onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save warehouse");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit && !needsWarehouse) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        needsWarehouse
          ? "border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-50"
          : "border-border bg-muted/30 text-foreground",
        compact ? "space-y-2" : "space-y-3"
      )}
    >
      <div className="flex items-start gap-2">
        <Icons.Warehouse
          className={cn("h-4 w-4 shrink-0 mt-0.5", needsWarehouse ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug">Fulfilment warehouse</p>
          {needsWarehouse ? (
            <p className="text-xs/relaxed opacity-90">
              Pick &amp; pack cannot run until a warehouse is set. Choose where stock will be picked from, or create a
              warehouse first.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Stock is picked from{" "}
              <span className="font-medium text-foreground">{currentLabel ?? warehouseId}</span>. Change it here while
              this delivery note is still a draft.
            </p>
          )}
        </div>
      </div>

      {canEdit ? (
        <div className={cn("space-y-2", compact ? "" : "sm:max-w-md")}>
          <Label htmlFor={`dn-warehouse-${documentId}`} className="text-xs">
            Warehouse
          </Label>
          {loadingOptions ? (
            <p className="text-xs text-muted-foreground">Loading warehouses…</p>
          ) : noWarehousesExist ? (
            <p className="text-xs">
              No warehouses exist yet.{" "}
              <Link href="/master/warehouses" className="font-medium underline underline-offset-2">
                Create a warehouse
              </Link>{" "}
              for this branch, then return here to select it.
            </p>
          ) : (
            <>
              <AsyncSearchableSelect
                value={selectedId}
                onValueChange={setSelectedId}
                loadOptions={loadWarehouseOptions}
                selectedOption={selectedWarehouseOption}
                placeholder="Select fulfilment warehouse…"
                searchPlaceholder="Search warehouses…"
                emptyMessage={
                  branchId
                    ? "No warehouses for this branch — try another or create one."
                    : "No warehouses found."
                }
                searchDebounceMs={0}
                onCreateNew={() => {
                  window.open("/master/warehouses", "_blank", "noopener,noreferrer");
                }}
                createNewLabel="Add warehouse"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !dirty || !selectedId.trim()}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Saving…" : needsWarehouse ? "Save warehouse" : "Update warehouse"}
                </Button>
                <Link
                  href="/master/warehouses"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Create warehouse
                </Link>
              </div>
            </>
          )}
        </div>
      ) : needsWarehouse ? (
        <p className="text-xs opacity-90">You do not have permission to set the warehouse on this document.</p>
      ) : null}
    </div>
  );
}
