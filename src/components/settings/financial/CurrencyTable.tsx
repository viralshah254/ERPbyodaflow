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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CurrencyCode } from "@/lib/org/financial-settings";
import { CURRENCY_META } from "@/lib/mock/financial-settings";
import * as Icons from "lucide-react";

interface CurrencyTableProps {
  enabledCurrencies: CurrencyCode[];
  onToggle: (code: CurrencyCode, enabled: boolean) => void;
  onAddCurrency: () => void;
}

export function CurrencyTable({
  enabledCurrencies,
  onToggle,
  onAddCurrency,
}: CurrencyTableProps) {
  const all = React.useMemo(
    () => Object.keys(CURRENCY_META) as CurrencyCode[],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Enabled currencies</h3>
        <Button variant="outline" size="sm" onClick={onAddCurrency}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add currency
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Enabled</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Decimals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.map((code) => {
              const meta = CURRENCY_META[code];
              const enabled = enabledCurrencies.includes(code);
              return (
                <TableRow key={code}>
                  <TableCell>
                    <Checkbox
                      checked={enabled}
                      onCheckedChange={(c) =>
                        onToggle(code, c === true)
                      }
                      aria-label={`Toggle ${code}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{code}</TableCell>
                  <TableCell>{meta?.name ?? "—"}</TableCell>
                  <TableCell>{meta?.symbol ?? "—"}</TableCell>
                  <TableCell>{meta?.decimals ?? 2}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
