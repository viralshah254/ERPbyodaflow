"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { DrillContext } from "@/lib/analytics/types";
import { getMetric } from "@/lib/analytics/semantic";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

export interface DrillDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: DrillContext | null;
}

function formatVal(v: number, format: string, currency: string) {
  return format === "currency"
    ? formatMoney(v, currency)
    : format === "percent"
      ? `${v.toFixed(1)}%`
      : format === "days"
        ? `${v} days`
        : v.toLocaleString();
}

export function DrillDrawer({
  open,
  onOpenChange,
  context,
}: DrillDrawerProps) {
  if (!context) return null;

  const def = getMetric(context.query.metric);
  const currency = context.query.filters?.currency ?? "KES";
  const href = `/${context.drillTarget}`;
  const dimLabels = Object.entries(context.row.dimensions).map(
    ([k, v]) => `${k.replace(/_/g, " ")}: ${v}`
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Drill into {def.label}</SheetTitle>
          <SheetDescription>
            {dimLabels.join(" · ")} — {formatVal(context.row.value, def.format, currency)}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Open {context.drillTarget} filtered by this slice.
          </p>
          <Button asChild>
            <Link href={href}>
              <Icons.ExternalLink className="mr-2 h-4 w-4" />
              View {context.drillTarget}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
