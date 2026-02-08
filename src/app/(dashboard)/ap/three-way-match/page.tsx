"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useCopilotStore } from "@/stores/copilot-store";
import {
  getMockPOLines,
  getMockGRNLines,
  getMockBillLines,
} from "@/lib/mock/ap-match";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type LineId = string;

export default function ThreeWayMatchPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [selectedPO, setSelectedPO] = React.useState<Set<LineId>>(new Set());
  const [selectedGRN, setSelectedGRN] = React.useState<Set<LineId>>(new Set());
  const [selectedBill, setSelectedBill] = React.useState<Set<LineId>>(new Set());

  const poLines = React.useMemo(() => getMockPOLines(), []);
  const grnLines = React.useMemo(() => getMockGRNLines(), []);
  const billLines = React.useMemo(() => getMockBillLines(), []);

  const togglePO = (id: LineId) => {
    setSelectedPO((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleGRN = (id: LineId) => {
    setSelectedGRN((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleBill = (id: LineId) => {
    setSelectedBill((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMatchSelected = () => {
    toast.info(
      `Match (stub): ${selectedPO.size} PO · ${selectedGRN.size} GRN · ${selectedBill.size} Bill`
    );
  };

  const explainThreeWay = () => {
    openWithPrompt("Explain: 3-way match between PO, GRN, and Bill. When do we have mismatches?");
  };

  const askWhyMismatch = () => {
    const ctx = [
      ...Array.from(selectedPO),
      ...Array.from(selectedGRN),
      ...Array.from(selectedBill),
    ].join(", ");
    openWithPrompt(
      `Why might we have a mismatch (qty or price) for these lines? ${ctx || "Select lines first."}`
    );
  };

  const mismatchSkus = React.useMemo(() => {
    const skus = new Set(poLines.map((l) => l.sku));
    const check = (sku: string) => {
      const po = poLines.find((l) => l.sku === sku);
      const grn = grnLines.find((l) => l.sku === sku);
      const bill = billLines.find((l) => l.sku === sku);
      if (!po || !grn || !bill) return false;
      const qtyMismatch = po.quantity !== grn.quantity || grn.quantity !== bill.quantity;
      const priceMismatch = po.unitPrice !== bill.unitPrice;
      return qtyMismatch || priceMismatch;
    };
    return Array.from(skus).filter(check);
  }, [poLines, grnLines, billLines]);

  return (
    <PageShell>
      <PageHeader
        title="3-way match"
        description="Match PO, GRN, and Bill lines. Resolve qty/price mismatches."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP", href: "/ap/bills" },
          { label: "3-way match" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={explainThreeWay}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Explain: 3-way match
            </Button>
            <Button variant="outline" size="sm" onClick={askWhyMismatch}>
              Ask Copilot: why mismatch?
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs/bill/new">Create Bill from PO</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {mismatchSkus.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Icons.AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Mismatch: qty or price differs across PO / GRN / Bill
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      SKUs: {mismatchSkus.join(", ")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={askWhyMismatch}>
                  Ask Copilot
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>PO lines</CardTitle>
              <CardDescription>Purchase order lines (mock)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>SKU</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poLines.map((row) => (
                      <TableRow
                        key={row.id}
                        className={mismatchSkus.includes(row.sku) ? "bg-amber-500/10" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedPO.has(row.id)}
                            onCheckedChange={() => togglePO(row.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>{formatMoney(row.unitPrice, "KES")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GRN lines</CardTitle>
              <CardDescription>Goods receipt lines (mock)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>SKU</TableHead>
                      <TableHead>Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnLines.map((row) => (
                      <TableRow
                        key={row.id}
                        className={mismatchSkus.includes(row.sku) ? "bg-amber-500/10" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedGRN.has(row.id)}
                            onCheckedChange={() => toggleGRN(row.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill lines</CardTitle>
              <CardDescription>Supplier bill lines (mock)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>SKU</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billLines.map((row) => (
                      <TableRow
                        key={row.id}
                        className={mismatchSkus.includes(row.sku) ? "bg-amber-500/10" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedBill.has(row.id)}
                            onCheckedChange={() => toggleBill(row.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>{formatMoney(row.unitPrice, "KES")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Match &amp; actions</CardTitle>
            <CardDescription>
              Select lines in each column, then Match selected. Create Bill from PO opens /docs/bill/new (stub).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Button
              variant="default"
              size="sm"
              disabled={selectedPO.size === 0 || selectedGRN.size === 0 || selectedBill.size === 0}
              onClick={handleMatchSelected}
            >
              Match selected
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedPO.size} PO · {selectedGRN.size} GRN · {selectedBill.size} Bill selected
            </span>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
