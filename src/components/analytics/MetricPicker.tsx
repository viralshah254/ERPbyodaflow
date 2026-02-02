"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METRICS } from "@/lib/analytics";
import type { MetricKey } from "@/lib/analytics/semantic";

export interface MetricPickerProps {
  value: MetricKey;
  onChange: (m: MetricKey) => void;
  className?: string;
}

export function MetricPicker({ value, onChange, className }: MetricPickerProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MetricKey)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Choose metric" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(METRICS) as MetricKey[]).map((k) => (
          <SelectItem key={k} value={k}>
            {METRICS[k].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
