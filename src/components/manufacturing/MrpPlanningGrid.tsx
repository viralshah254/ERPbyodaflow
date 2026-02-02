"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MrpPeriod, MrpItem } from "@/lib/mock/mrp-planning";

export interface MrpPlanningGridProps {
  periods: MrpPeriod[];
  items: MrpItem[];
  getCell: (itemId: string, periodId: string) => { requirements: number; plannedOrders: number };
  /** Optional filter: only items whose SKU/name match */
  itemFilter?: string;
  className?: string;
}

export function MrpPlanningGrid({
  periods,
  items,
  getCell,
  itemFilter = "",
  className,
}: MrpPlanningGridProps) {
  const filtered = React.useMemo(() => {
    if (!itemFilter.trim()) return items;
    const q = itemFilter.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [items, itemFilter]);

  return (
    <div className={cn("overflow-auto max-h-[calc(100vh-22rem)] rounded-md border", className)}>
      <Table>
        <TableHeader className="sticky top-0 z-30 bg-muted/95 backdrop-blur [&_tr]:bg-muted/95">
            <TableRow className="bg-muted/50">
            <TableHead className="w-[180px] min-w-[180px] sticky left-0 z-20 bg-muted/80 font-medium">
              Item
            </TableHead>
            <TableHead className="w-[90px] min-w-[90px] sticky left-[180px] z-20 bg-muted/80 font-medium text-right">
              On hand
            </TableHead>
            <TableHead className="w-[90px] min-w-[90px] sticky left-[270px] z-20 bg-muted/80 font-medium text-right">
              UoM
            </TableHead>
            {periods.map((p) => (
              <TableHead
                key={p.id}
                className="min-w-[100px] text-center font-medium whitespace-nowrap"
              >
                {p.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow className="bg-muted/30">
            <TableCell className="sticky left-0 z-10 bg-muted/30" colSpan={3} />
            {periods.map((p) => (
              <TableCell
                key={p.id}
                className="text-center text-xs text-muted-foreground"
              >
                <span title={`${p.start} – ${p.end}`}>Req / Plan</span>
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3 + periods.length} className="h-24 text-center text-muted-foreground">
                No items match the filter.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">
                  <div className="flex flex-col">
                    <span>{item.sku}</span>
                    <span className="text-xs text-muted-foreground font-normal truncate max-w-[160px]">
                      {item.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="sticky left-[180px] z-10 bg-background text-right tabular-nums">
                  {item.onHand}
                </TableCell>
                <TableCell className="sticky left-[270px] z-10 bg-background text-right text-muted-foreground">
                  {item.uom}
                </TableCell>
                {periods.map((p) => {
                  const { requirements, plannedOrders } = getCell(
                    item.id,
                    p.id
                  );
                  return (
                    <TableCell
                      key={p.id}
                      className="text-center tabular-nums min-w-[100px] px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={cn(
                            requirements > 0 && "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {requirements}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {plannedOrders > 0 ? plannedOrders : "—"}
                        </span>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
