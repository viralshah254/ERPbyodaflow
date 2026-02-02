"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsGlobalFilters } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

export type { AnalyticsGlobalFilters as GlobalFilters };

export interface GlobalFilterBarProps {
  filters: AnalyticsGlobalFilters;
  onChange: (f: AnalyticsGlobalFilters) => void;
  className?: string;
}

const BRANCHES = ["Nairobi HQ", "Mombasa", "All"];
const ENTITIES = ["OdaFlow KE", "OdaFlow TZ", "All"];
const CURRENCIES = ["KES", "USD", "All"];

export function GlobalFilterBar({
  filters,
  onChange,
  className,
}: GlobalFilterBarProps) {
  const set = (k: keyof AnalyticsGlobalFilters, v: string) => {
    onChange({ ...filters, [k]: v || undefined });
  };

  const from = filters.dateFrom ?? "";
  const to = filters.dateTo ?? "";

  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>
      <div className="space-y-1.5">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="w-36"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => set("dateTo", e.target.value)}
          className="w-36"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Branch</Label>
        <Select
          value={filters.branch ?? "all"}
          onValueChange={(v) => set("branch", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {BRANCHES.filter((b) => b !== "All").map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Entity</Label>
        <Select
          value={filters.entity ?? "all"}
          onValueChange={(v) => set("entity", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {ENTITIES.filter((e) => e !== "All").map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Currency</Label>
        <Select
          value={filters.currency ?? "all"}
          onValueChange={(v) => set("currency", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CURRENCIES.filter((c) => c !== "All").map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
