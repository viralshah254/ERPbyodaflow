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
import { fetchLandedCostSources, fetchLandedCostTemplates, postLandedCostAllocation, type LandedCostSourceRow, type LandedCostTemplateRow } from "@/lib/api/landed-cost";
import { runCosting } from "@/lib/api/stub-endpoints";
import { listCostingRuns, listLandedCostAllocations } from "@/lib/data/inventory-costing.repo";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LANDED_COST_TYPE_LABELS: Record<string, string> = {
  freight: "Freight",
  insurance: "Insurance",
  duty: "Import duty",
  other: "Other",
  permit: "Permits",
  border: "Border / customs",
  inbound_freight: "Inbound freight",
  outbound_freight: "Outbound freight",
  storage: "Cold storage",
};

export default function InventoryCostingPage() {
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const [warehouseFilter, setWarehouseFilter] = React.useState("ALL");
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<LandedCostSourceRow | null>(null);
  const [sources, setSources] = React.useState<LandedCostSourceRow[]>([]);
  const [templates, setTemplates] = React.useState<LandedCostTemplateRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = React.useState(true);
  const [allocationTemplateId, setAllocationTemplateId] = React.useState("");
  const [allocationAmount, setAllocationAmount] = React.useState("");
  const [allocationSaving, setAllocationSaving] = React.useState(false);
  const [runCostingLoading, setRunCostingLoading] = React.useState(false);
  const [costingRuns, setCostingRuns] = React.useState(() => listCostingRuns());
  const [allocations, setAllocations] = React.useState(() => listLandedCostAllocations());

  const summary = React.useMemo(
    () =>
      getMockValuationSummary(
        warehouseFilter === "ALL" ? undefined : { warehouse: warehouseFilter }
      ),
    [warehouseFilter]
  );
  const warehouses = React.useMemo(() => Array.from(new Set(summary.map((s) => s.warehouse))), [summary]);

  React.useEffect(() => {
    let cancelled = false;
    setSourcesLoading(true);
    Promise.all([fetchLandedCostSources(), fetchLandedCostTemplates()])
      .then(([srcList, tplList]) => {
        if (!cancelled) {
          setSources(srcList);
          setTemplates(tplList);
        }
      })
      .catch(() => {
        if (!cancelled) setSources([]);
      })
      .finally(() => {
        if (!cancelled) setSourcesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openAllocation = (src: LandedCostSourceRow) => {
    setSelectedSource(src);
    setAllocationTemplateId("");
    setAllocationAmount("");
    setAllocationOpen(true);
  };

  const handleSaveAllocation = async () => {
    if (!selectedSource) return;
    const templateId = allocationTemplateId.trim();
    const amount = Number(allocationAmount);
    if (!templateId || Number.isNaN(amount) || amount <= 0) {
      toast.error("Select a template and enter a valid amount.");
      return;
    }
    setAllocationSaving(true);
    try {
      await postLandedCostAllocation({
        sourceId: selectedSource.id,
        lines: [{ templateId, amount, currency: selectedSource.currency }],
      });
      setAllocations(listLandedCostAllocations());
      toast.success("Landed cost allocation saved.");
      setAllocationOpen(false);
      setSelectedSource(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save allocation.");
    } finally {
      setAllocationSaving(false);
    }
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={runCostingLoading}
              onClick={async () => {
                setRunCostingLoading(true);
                try {
                  await runCosting();
                  setCostingRuns(listCostingRuns());
                  toast.success("Costing run completed.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setRunCostingLoading(false);
                }
              }}
            >
              <Icons.Play className="mr-2 h-4 w-4" />
              Run costing
            </Button>
            {hasCashWeightAudit && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/purchasing/cash-weight-audit">Cash-to-weight audit</Link>
              </Button>
            )}
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
              <CardDescription>By warehouse and category, with landed-cost and periodic run visibility.</CardDescription>
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
            <CardDescription>Select GRN or Bill, add landed cost lines (freight, duty, permits, inbound/outbound, storage). Allocate by qty, value, or weight. Multi-currency (e.g. KES/UGX) supported.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Currency</TableHead>
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
                    <TableCell>{s.currency}</TableCell>
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
            {sourcesLoading && (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading sources…</div>
            )}
            {!sourcesLoading && sources.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No GRNs or bills to allocate. Select a document to add landed costs.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Costing activity</CardTitle>
            <CardDescription>Recent landed-cost allocations and costing runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Recent allocations</p>
              {allocations.length === 0 ? (
                <p className="text-muted-foreground">No allocations recorded yet.</p>
              ) : (
                allocations.slice(0, 3).map((allocation) => (
                  <p key={allocation.id} className="text-muted-foreground">
                    {allocation.sourceId} · {allocation.lines.length} line(s) · {new Date(allocation.postedAt).toLocaleString()}
                  </p>
                ))
              )}
            </div>
            <div>
              <p className="font-medium">Recent costing runs</p>
              {costingRuns.length === 0 ? (
                <p className="text-muted-foreground">No costing runs executed yet.</p>
              ) : (
                costingRuns.slice(0, 3).map((run) => (
                  <p key={run.id} className="text-muted-foreground">
                    {run.period} · {run.status} · {new Date(run.completedAt).toLocaleString()}
                  </p>
                ))
              )}
            </div>
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
                  <Select value={allocationTemplateId} onValueChange={setAllocationTemplateId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {LANDED_COST_TYPE_LABELS[t.type] ?? t.name} — {t.allocationBasis}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Amount"
                    className="w-28"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocate by qty, value, or weight. For weight-based allocation (e.g. fish), ensure GRN lines have weight; multi-currency sources (e.g. UGX) use exchange rate to base.
              </p>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAllocationOpen(false)} disabled={allocationSaving}>Cancel</Button>
            <Button onClick={handleSaveAllocation} disabled={allocationSaving}>
              {allocationSaving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
