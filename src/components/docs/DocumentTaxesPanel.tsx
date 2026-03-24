"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { fetchDocumentDetailApi } from "@/lib/api/documents";
import type { DocumentDetailRecord } from "@/lib/types/documents";
import {
  fetchLandedCostAllocation,
  type ExistingLandedCostAllocation,
} from "@/lib/api/landed-cost";
import * as Icons from "lucide-react";

interface VatLine {
  code: string;
  base: number;
  rate: number;
  amount: number;
}

interface WhtLine {
  code: string;
  base: number;
  rate: number;
  amount: number;
}

export interface DocumentTaxesPanelProps {
  docType: string;
  docId: string;
  currency?: string;
}

const COST_CENTRE_LABELS: Record<string, string> = {
  currency_conversion: "Currency conversion",
  permits: "Permits",
  inbound_logistics: "Inbound logistics",
  other: "Other charges",
};

function costCentreLabel(cc?: string) {
  return cc ? (COST_CENTRE_LABELS[cc] ?? cc) : "Other charges";
}

function LandedCostCard({
  allocation,
  docTotal,
  currency,
  editHref,
  readonly,
}: {
  allocation: ExistingLandedCostAllocation;
  docTotal: number;
  currency: string;
  editHref: string;
  readonly: boolean;
}) {
  const totalLanded =
    allocation.impactLines?.reduce((s, l) => s + (l.allocatedAmount ?? 0), 0) ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Landed costs</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {allocation.allocationMethod ?? "allocated"}
          </Badge>
          {readonly ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={editHref}>
                <Icons.ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                View GRN landed costs
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={editHref}>
                <Icons.Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Charge</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocation.lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  {costCentreLabel(line.costCentre)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {line.reference ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.amount, line.currency ?? currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Cost summary */}
        <div className="border-t px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Goods value</span>
            <span className="tabular-nums">{formatMoney(docTotal, currency)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Landed costs</span>
            <span className="tabular-nums">+ {formatMoney(totalLanded, currency)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
            <span>Actual total cost</span>
            <span className="tabular-nums">{formatMoney(docTotal + totalLanded, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoLandedCostCard({ editHref }: { editHref: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <Icons.Package className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">No landed costs recorded</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add freight, duty, customs or other charges to calculate actual total cost.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={editHref}>
            <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
            Add landed costs
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DocumentTaxesPanel({
  docType,
  docId,
  currency = "KES",
}: DocumentTaxesPanelProps) {
  const [vat, setVat] = React.useState<VatLine[]>([]);
  const [wht, setWht] = React.useState<WhtLine[]>([]);
  const [lineTaxRows, setLineTaxRows] = React.useState<
    Array<{
      key: string;
      description: string;
      code: string;
      name?: string;
      rate?: number;
    }>
  >([]);
  const [docTotal, setDocTotal] = React.useState(0);
  const [docCurrency, setDocCurrency] = React.useState(currency);

  // For GRN: allocation on this doc. For bill: allocation on the source GRN.
  const [landedAllocation, setLandedAllocation] =
    React.useState<ExistingLandedCostAllocation | null>(null);
  const [landedSourceId, setLandedSourceId] = React.useState<string | null>(null);
  const [loadingLanded, setLoadingLanded] = React.useState(false);

  const isGrn = docType === "grn";
  const isBill = docType === "bill";

  React.useEffect(() => {
    fetchDocumentDetailApi(docType as never, docId)
      .then((document) => {
        const lines = (document?.lines ?? []) as DocumentDetailRecord["lines"];
        const total = document?.total ?? lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
        const curr = document?.currency ?? currency;
        setDocTotal(total);
        setDocCurrency(curr);

        const taxLines = lines.filter(
          (l) =>
            l.effectiveTaxCodeId != null ||
            l.taxCodeCode != null ||
            typeof l.taxRate === "number"
        );
        setLineTaxRows(
          taxLines.map((line, i) => ({
            key: line.id ?? `line-${i}`,
            description: (line.productName ?? line.description ?? "Line").trim() || "Line",
            code: line.taxCodeCode ?? "—",
            name: line.taxCodeName,
            rate: line.taxRate,
          }))
        );

        const totalTax = lines.reduce((sum, line) => sum + (line.tax ?? 0), 0);
        const totalBase = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
        if (["invoice", "bill"].includes(docType) && totalTax > 0) {
          setVat([
            {
              code: "DOC-TAX",
              base: totalBase,
              rate: totalBase > 0 ? Number(((totalTax / totalBase) * 100).toFixed(2)) : 0,
              amount: totalTax,
            },
          ]);
        } else {
          setVat([]);
        }
        if (docType === "bill" && totalTax > 0) {
          setWht([
            {
              code: "WHT-EST",
              base: totalBase,
              rate: totalBase > 0 ? Number(((totalTax / totalBase) * 100).toFixed(2)) : 0,
              amount: totalTax,
            },
          ]);
        } else {
          setWht([]);
        }

        // Determine which ID to fetch landed costs for
        if (isGrn) {
          setLandedSourceId(docId);
        } else if (isBill && document?.sourceDocument?.typeKey === "grn") {
          setLandedSourceId(document.sourceDocument.id);
        }
      })
      .catch(() => {
        setVat([]);
        setWht([]);
        setLineTaxRows([]);
      });
  }, [docId, docType, currency, isGrn, isBill]);

  React.useEffect(() => {
    if (!landedSourceId) return;
    setLoadingLanded(true);
    fetchLandedCostAllocation(landedSourceId)
      .then((alloc) => setLandedAllocation(alloc))
      .catch(() => setLandedAllocation(null))
      .finally(() => setLoadingLanded(false));
  }, [landedSourceId]);

  const vatTotal = vat.reduce((s, l) => s + l.amount, 0);
  const whtTotal = wht.reduce((s, l) => s + l.amount, 0);
  const editHref = landedSourceId
    ? `/inventory/costing?sourceId=${encodeURIComponent(landedSourceId)}`
    : "/inventory/costing";

  return (
    <div className="space-y-4">
      {lineTaxRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line tax codes</CardTitle>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              Tax bracket applied per line (from the line or the product default). VAT amounts appear when calculated on
              posted tax documents.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineTaxRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="max-w-[220px]">
                      <span className="font-medium line-clamp-2">{row.description}</span>
                      {row.name && row.name !== row.description ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.name}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {typeof row.rate === "number" ? `${row.rate}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {/* VAT breakdown */}
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
                    <TableCell className="text-right">{formatMoney(l.base, docCurrency)}</TableCell>
                    <TableCell className="text-right">{l.rate}%</TableCell>
                    <TableCell className="text-right">{formatMoney(l.amount, docCurrency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-sm font-medium border-t flex justify-end">
              VAT total: {formatMoney(vatTotal, docCurrency)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WHT breakdown */}
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
                    <TableCell className="text-right">{formatMoney(l.base, docCurrency)}</TableCell>
                    <TableCell className="text-right">{l.rate}%</TableCell>
                    <TableCell className="text-right">{formatMoney(l.amount, docCurrency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-sm font-medium border-t flex justify-end">
              WHT total: {formatMoney(whtTotal, docCurrency)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landed costs — GRN (editable) or Bill (read-only from source GRN) */}
      {(isGrn || isBill) && (
        <>
          {loadingLanded ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                Loading landed costs…
              </CardContent>
            </Card>
          ) : landedAllocation ? (
            <LandedCostCard
              allocation={landedAllocation}
              docTotal={docTotal}
              currency={docCurrency}
              editHref={editHref}
              readonly={isBill}
            />
          ) : (
            isGrn && <NoLandedCostCard editHref={editHref} />
          )}

          {/* Bill with no GRN source or no allocation — show informational note */}
          {isBill && !landedAllocation && !loadingLanded && (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
                {landedSourceId
                  ? "No landed costs have been recorded on the linked GRN."
                  : "This bill has no linked GRN. Landed costs are recorded at GRN level."}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Fallback for non-GRN/Bill types with no tax */}
      {!isGrn && !isBill && vat.length === 0 && wht.length === 0 && lineTaxRows.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
            No VAT or WHT lines for this document. Configure tax codes and mappings in Settings → Tax.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
