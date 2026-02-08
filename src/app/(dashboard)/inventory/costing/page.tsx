"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMockValuationSummary } from "@/lib/mock/inventory/costing";
import { getMockLandedCostSources, getMockLandedCostTemplates, type LandedCostSourceRow } from "@/lib/mock/inventory/landed-cost";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function InventoryCostingPage() {
  // Use a non-empty sentinel value for "all" to avoid Radix Select runtime error
  const [warehouseFilter, setWarehouseFilter] = React.useState("ALL");
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<LandedCostSourceRow | null>(null);

  const summary = React.useMemo(
    () =>
      getMockValuationSummary(
        warehouseFilter === "ALL" ? undefined : { warehouse: warehouseFilter }
      ),
    [warehouseFilter]
  );
  const sources = React.useMemo(() => getMockLandedCostSources(), []);
  const templates = React.useMemo(() => getMockLandedCostTemplates(), []);
  const warehouses = React.useMemo(() => Array.from(new Set(summary.map((s) => s.warehouse))), [summary]);

  const openAllocation = (src: LandedCostSourceRow) => {
    setSelectedSource(src);
    setAllocationOpen(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Inventory costing"
        description="Stock valuation, landed cost allocation"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Costing" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain inventory costing, FIFO vs weighted average, and landed cost allocation." label="Explain costing" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/inventory/costing">Costing settings</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stock valuation summary</CardTitle>
              <CardDescription>By warehouse / category. Mock.</CardDescription>
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU count</TableHead>
                  <TableHead>Total qty</TableHead>
                  <TableHead>Total value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.warehouse}</TableCell>
                    <TableCell>{r.category ?? "—"}</TableCell>
                    <TableCell>{r.skuCount}</TableCell>
                    <TableCell>{r.totalQty}</TableCell>
                    <TableCell>{formatMoney(r.totalValue, r.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Landed cost allocation</CardTitle>
            <CardDescription>Select GRN or Bill, add landed cost lines, allocate by qty/value/weight. Stub.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="uppercase">{s.type}</TableCell>
                    <TableCell className="font-medium">{s.number}</TableCell>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.supplier ?? "—"}</TableCell>
                    <TableCell>{formatMoney(s.totalAmount, s.currency)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openAllocation(s)}>
                        Allocate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sources.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No GRNs or bills to allocate. Select a document to add landed costs.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={allocationOpen} onOpenChange={setAllocationOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Landed cost allocation</SheetTitle>
            <SheetDescription>
              {selectedSource?.number}. Add lines, allocate by qty/value/weight. Per-unit cost impact (mock).
            </SheetDescription>
          </SheetHeader>
          {selectedSource && (
            <div className="mt-6 space-y-4">
              <div className="rounded border p-3 text-sm">
                <p className="font-medium">{selectedSource.number}</p>
                <p className="text-muted-foreground">{formatMoney(selectedSource.totalAmount, selectedSource.currency)}</p>
              </div>
              <div className="space-y-2">
                <Label>Add landed cost line</Label>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.allocationBasis})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Amount" className="w-28" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocate by qty / value / weight. Resulting per-unit cost impact shown after save (stub).
              </p>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAllocationOpen(false)}>Cancel</Button>
            <Button onClick={() => { setAllocationOpen(false); toast.info("Save allocation (stub). API pending."); }}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
