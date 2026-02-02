"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";

/** Mock VAT breakdown line. */
interface VatLine {
  code: string;
  base: number;
  rate: number;
  amount: number;
}

/** Mock WHT line. */
interface WhtLine {
  code: string;
  base: number;
  rate: number;
  amount: number;
}

/** Mock data for document taxes tab. */
function mockVatBreakdown(docType: string): VatLine[] {
  if (["invoice", "bill", "credit-note"].includes(docType)) {
    return [
      { code: "VAT16", base: 10000, rate: 16, amount: 1600 },
      { code: "VAT0", base: 5000, rate: 0, amount: 0 },
    ];
  }
  return [];
}

function mockWhtLines(docType: string): WhtLine[] {
  if (["bill", "supplier-invoice", "ap-bill"].includes(docType)) {
    return [{ code: "WHT-5", base: 10000, rate: 5, amount: 500 }];
  }
  return [];
}

export interface DocumentTaxesPanelProps {
  docType: string;
  docId: string;
  currency?: string;
}

export function DocumentTaxesPanel({
  docType,
  docId,
  currency = "KES",
}: DocumentTaxesPanelProps) {
  const vat = React.useMemo(() => mockVatBreakdown(docType), [docType]);
  const wht = React.useMemo(() => mockWhtLines(docType), [docType]);
  const vatTotal = vat.reduce((s, l) => s + l.amount, 0);
  const whtTotal = wht.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-4">
      {vat.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">VAT breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vat.map((l) => (
                  <TableRow key={l.code}>
                    <TableCell className="font-medium">{l.code}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.base, currency)}</TableCell>
                    <TableCell className="text-right">{l.rate}%</TableCell>
                    <TableCell className="text-right">{formatMoney(l.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-sm font-medium border-t flex justify-end">
              VAT total: {formatMoney(vatTotal, currency)}
            </div>
          </CardContent>
        </Card>
      )}
      {wht.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withholding tax (WHT)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wht.map((l) => (
                  <TableRow key={l.code}>
                    <TableCell className="font-medium">{l.code}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.base, currency)}</TableCell>
                    <TableCell className="text-right">{l.rate}%</TableCell>
                    <TableCell className="text-right">{formatMoney(l.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-sm font-medium border-t flex justify-end">
              WHT total: {formatMoney(whtTotal, currency)}
            </div>
          </CardContent>
        </Card>
      )}
      {vat.length === 0 && wht.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
            No VAT or WHT lines for this document. Configure tax codes and mappings in Settings → Tax.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
