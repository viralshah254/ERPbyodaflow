"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CurrencyCode } from "@/lib/org/financial-settings";
import { CURRENCY_META } from "@/lib/mock/financial-settings";
import * as Icons from "lucide-react";

interface BaseCurrencyCardProps {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
  enabledCurrencies: CurrencyCode[];
}

export function BaseCurrencyCard({
  value,
  onChange,
  enabledCurrencies,
}: BaseCurrencyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Base currency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <Icons.AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Base currency should not change after posting transactions.
          </span>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Currency</label>
          <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enabledCurrencies.map((code) => (
                <SelectItem key={code} value={code}>
                  {code} — {CURRENCY_META[code]?.name ?? code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
