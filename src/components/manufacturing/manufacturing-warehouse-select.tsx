"use client";

import * as React from "react";
import {
  AsyncSearchableSelect,
  type AsyncSearchableSelectOption,
} from "@/components/ui/async-searchable-select";
import { cn } from "@/lib/utils";

export type ManufacturingWarehouseRow = { id: string; code?: string; name: string };

export const MANUFACTURING_DEFER_STORE = "__none__";
export const MANUFACTURING_DEFER_STORE_LABEL = "Choose on work order";

export function manufacturingWarehouseLabel(warehouse: ManufacturingWarehouseRow): string {
  const code = warehouse.code?.trim();
  return code && code.toLowerCase() !== warehouse.name.trim().toLowerCase()
    ? `${code} — ${warehouse.name}`
    : warehouse.name;
}

export function manufacturingWarehouseOptions(
  warehouses: ManufacturingWarehouseRow[],
  query: string,
  deferOption: AsyncSearchableSelectOption,
): AsyncSearchableSelectOption[] {
  const needle = query.trim().toLowerCase();
  const stores = warehouses
    .map((warehouse) => ({ id: warehouse.id, label: manufacturingWarehouseLabel(warehouse) }))
    .filter((option) => !needle || option.label.toLowerCase().includes(needle));
  return needle ? stores : [deferOption, ...stores];
}

export function manufacturingDeferStoreOption(kind: "input" | "output"): AsyncSearchableSelectOption {
  const description =
    kind === "output"
      ? "No fixed store. Pick the output store when you start each work order."
      : "No fixed store. Pick the input stores when you start each work order.";
  return {
    id: MANUFACTURING_DEFER_STORE,
    label: MANUFACTURING_DEFER_STORE_LABEL,
    description,
  };
}

interface ManufacturingWarehouseSelectProps {
  value: string;
  onValueChange: (warehouseId: string) => void;
  warehouses: ManufacturingWarehouseRow[];
  kind: "input" | "output";
  id?: string;
  disabled?: boolean;
  triggerClassName?: string;
  /** Tighter trigger for table rows; form fields use the default full-width label. */
  compact?: boolean;
}

export function ManufacturingWarehouseSelect({
  value,
  onValueChange,
  warehouses,
  kind,
  id,
  disabled = false,
  triggerClassName,
  compact = false,
}: ManufacturingWarehouseSelectProps) {
  const deferOption = React.useMemo(() => manufacturingDeferStoreOption(kind), [kind]);
  const warehouse = value ? warehouses.find((row) => row.id === value) : undefined;
  const selectedOption = warehouse
    ? { id: warehouse.id, label: manufacturingWarehouseLabel(warehouse) }
    : deferOption;

  return (
    <AsyncSearchableSelect
      id={id}
      disabled={disabled}
      value={value || MANUFACTURING_DEFER_STORE}
      selectedOption={selectedOption}
      onValueChange={(next) => onValueChange(next === MANUFACTURING_DEFER_STORE ? "" : next)}
      loadOptions={async (query) => manufacturingWarehouseOptions(warehouses, query, deferOption)}
      searchDebounceMs={0}
      placeholder={MANUFACTURING_DEFER_STORE_LABEL}
      searchPlaceholder="Find a store"
      emptyMessage="No store matches."
      triggerClassName={cn(compact ? "h-8 min-w-[9rem] max-w-[14rem]" : "min-h-10", triggerClassName)}
      wrapLabels={!compact}
      clipLabels={compact}
      minDropdownWidth={280}
    />
  );
}