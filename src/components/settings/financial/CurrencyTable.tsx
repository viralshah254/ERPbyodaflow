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
import type { FinancialCurrencyRow } from "@/lib/api/financial-settings";
import * as Icons from "lucide-react";

interface CurrencyTableProps {
  currencies: FinancialCurrencyRow[];
  onToggle: (code: string, enabled: boolean) => void;
  onAddCurrency: () => void;
}

export function CurrencyTable({
  currencies,
  onToggle,
  onAddCurrency,
}: CurrencyTableProps) {
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
            {currencies.map((currency) => {
              return (
                <TableRow key={currency.code}>
                  <TableCell>
                    <Checkbox
                      checked={currency.enabled}
                      onCheckedChange={(c) =>
                        onToggle(currency.code, c === true)
                      }
                      aria-label={`Toggle ${currency.code}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{currency.code}</TableCell>
                  <TableCell>{currency.name ?? "—"}</TableCell>
                  <TableCell>{currency.symbol ?? "—"}</TableCell>
                  <TableCell>2</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
