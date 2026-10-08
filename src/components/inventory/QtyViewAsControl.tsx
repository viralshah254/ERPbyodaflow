"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { QtyDisplayMode } from "@/lib/products/sku-uom";

export type QtyViewAsValue = {
  mode: QtyDisplayMode;
  selectedUom?: string;
};

/**
 * Global display control — never mutates underlying stock quantities.
 */
export function QtyViewAsControl({
  value,
  onChange,
  uomOptions = [],
  className,
}: {
  value: QtyViewAsValue;
  onChange: (next: QtyViewAsValue) => void;
  /** Extra UOMs offered under "Select UOM" (union across visible SKUs). */
  uomOptions?: string[];
  className?: string;
}) {
  return (
    <div className={className ?? "flex flex-wrap items-end gap-2"}>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Display quantities as</Label>
        <Select
          value={value.mode}
          onValueChange={(mode) =>
            onChange({
              ...value,
              mode: mode as QtyDisplayMode,
            })
          }
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">Base UOM</SelectItem>
            <SelectItem value="preferred">Preferred UOM</SelectItem>
            <SelectItem value="select">Select UOM</SelectItem>
            <SelectItem value="breakdown">Pack Breakdown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.mode === "select" ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">UOM</Label>
          <Select
            value={value.selectedUom || ""}
            onValueChange={(selectedUom) => onChange({ ...value, selectedUom })}
          >
            <SelectTrigger className="h-9 w-[140px] font-mono">
              <SelectValue placeholder="UOM" />
            </SelectTrigger>
            <SelectContent>
              {uomOptions.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
