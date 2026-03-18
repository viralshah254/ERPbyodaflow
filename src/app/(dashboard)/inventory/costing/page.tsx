"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { fetchLandedCostSources, fetchLandedCostTemplates, postLandedCostAllocation, type LandedCostSourceRow, type LandedCostTemplateRow } from "@/lib/api/landed-cost";
import { fetchInventoryValuation, fetchLatestInventoryCosting, runInventoryCostingApi } from "@/lib/api/inventory-costing";
import { listLandedCostAllocations } from "@/lib/data/inventory-costing.repo";
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

/** CoolCatch quick-add presets: common cost types for Kenya/Uganda cross-border sourcing */
const COOLCATCH_QUICK_PRESETS = [
  { type: "permit", label: "Fishing permit", currency: "KES" },
  { type: "border", label: "Border clearance", currency: "UGX" },
  { type: "inbound_freight", label: "Inbound freight (farm → hub)", currency: "KES" },
] as const;

interface AllocationLine {
  templateId: string;
  amount: string;
  currency: string;
}

export default function InventoryCostingPage() {
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const hasLandedCostMultiCurrency = useOrgContextStore((s) => s.hasFlag?.("landedCostMultiCurrency") ?? false);
  const [warehouseFilter, setWarehouseFilter] = React.useState("ALL");
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<LandedCostSourceRow | null>(null);
  const [sources, setSources] = React.useState<LandedCostSourceRow[]>([]);
  const [templates, setTemplates] = React.useState<LandedCostTemplateRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = React.useState(true);
  const [allocationLines, setAllocationLines] = React.useState<AllocationLine[]>([{ templateId: "", amount: "", currency: "KES" }]);
  const [allocationSaving, setAllocationSaving] = React.useState(false);
  const [runCostingLoading, setRunCostingLoading] = React.useState(false);
  const [costingSnapshot, setCostingSnapshot] = React.useState<{ ranAt: string | null; method: string; updated: number; totalValue: number }>({
    ranAt: null,
    method: "WEIGHTED_AVERAGE",
    updated: 0,
    totalValue: 0,
  });
  const [valuationSummary, setValuationSummary] = React.useState<Array<{
    warehouseId: string;
    warehouse: string;
    skuCount: number;
    totalQty: number;
    totalValue: number;
  }>>([]);
  const [allocations, setAllocations] = React.useState(() => listLandedCostAllocations());

  const summary = React.useMemo(
    () => valuationSummary.filter((row) => warehouseFilter === "ALL" || row.warehouseId === warehouseFilter),
    [valuationSummary, warehouseFilter]
  );
  const warehouses = React.useMemo(() => Array.from(new Set(summary.map((s) => s.warehouse))), [summary]);

  const searchParams = useSearchParams();
  const sourceIdFromUrl = searchParams.get("sourceId");

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

  React.useEffect(() => {
    if (sourceIdFromUrl && sources.length > 0) {
      const src = sources.find((s) => s.id === sourceIdFromUrl);
      if (src) {
        setSelectedSource(src);
        setAllocationLines([{ templateId: "", amount: "", currency: src.currency ?? "KES" }]);
        setAllocationOpen(true);
        window.history.replaceState({}, "", "/inventory/costing");
      }
    }
  }, [sourceIdFromUrl, sources]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchInventoryValuation(), fetchLatestInventoryCosting()])
      .then(([valuation, snapshot]) => {
        if (cancelled) return;
        setValuationSummary(valuation.summary);
        setCostingSnapshot({
          ranAt: snapshot.ranAt,
          method: snapshot.method,
          updated: snapshot.updated,
          totalValue: snapshot.totalValue,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setValuationSummary([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openAllocation = (src: LandedCostSourceRow) => {
    setSelectedSource(src);
    setAllocationLines([{ templateId: "", amount: "", currency: src.currency ?? "KES" }]);
    setAllocationOpen(true);
  };

  const addAllocationLine = () => {
    setAllocationLines((prev) => [...prev, { templateId: "", amount: "", currency: selectedSource?.currency ?? "KES" }]);
  };

  const removeAllocationLine = (index: number) => {
    setAllocationLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateAllocationLine = (index: number, field: keyof AllocationLine, value: string) => {
    setAllocationLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const applyCoolCatchPresets = () => {
    if (!templates.length) return;
    const presetLines: AllocationLine[] = COOLCATCH_QUICK_PRESETS.map((p) => {
      const tpl = templates.find((t) => t.type === p.type);
      return {
        templateId: tpl?.id ?? "",
        amount: "",
        currency: p.currency,
      };
    }).filter((l) => l.templateId);
    if (presetLines.length) setAllocationLines(presetLines);
    else toast.info("No matching templates found. Create permit, border, inbound freight templates first.");
  };

  const handleSaveAllocation = async () => {
    if (!selectedSource) return;
    const lines = allocationLines
      .map((l) => ({ templateId: l.templateId.trim(), amount: Number(l.amount), currency: l.currency || "KES" }))
      .filter((l) => l.templateId && !Number.isNaN(l.amount) && l.amount > 0);
    if (!lines.length) {
      toast.error("Add at least one cost line with template and amount.");
      return;
    }
    setAllocationSaving(true);
    try {
      await postLandedCostAllocation({
        sourceId: selectedSource.id,
        lines: lines.map((l) => ({ templateId: l.templateId, amount: l.amount, currency: l.currency })),
      });
      setAllocations(listLandedCostAllocations());
      toast.success(`Landed cost saved (${lines.length} line${lines.length > 1 ? "s" : ""}).`);
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
                  await runInventoryCostingApi();
                  const [valuation, snapshot] = await Promise.all([
                    fetchInventoryValuation(),
                    fetchLatestInventoryCosting(),
                  ]);
                  setValuationSummary(valuation.summary);
                  setCostingSnapshot({
                    ranAt: snapshot.ranAt,
                    method: snapshot.method,
                    updated: snapshot.updated,
                    totalValue: snapshot.totalValue,
                  });
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
                  <TableHead>SKU count</TableHead>
                  <TableHead>Total qty</TableHead>
                  <TableHead>Total value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((r) => (
                  <TableRow key={r.warehouseId}>
                    <TableCell className="font-medium">{r.warehouse}</TableCell>
                    <TableCell>{r.skuCount}</TableCell>
                    <TableCell>{r.totalQty}</TableCell>
                    <TableCell>{formatMoney(r.totalValue, "KES")}</TableCell>
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
              {!costingSnapshot.ranAt ? (
                <p className="text-muted-foreground">No costing runs executed yet.</p>
              ) : (
                <p className="text-muted-foreground">
                  {costingSnapshot.method} · {costingSnapshot.updated} stock levels · {new Date(costingSnapshot.ranAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={allocationOpen} onOpenChange={setAllocationOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Landed cost allocation</SheetTitle>
            <SheetDescription>
              {selectedSource?.number}. Add permit, border, freight, etc. Multi-currency (KES/UGX) supported. Costs allocate by weight.
            </SheetDescription>
          </SheetHeader>
          {selectedSource && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{selectedSource.number}</p>
                <p className="text-muted-foreground">
                  {formatMoney((selectedSource as { totalAmount?: number; total?: number }).totalAmount ?? (selectedSource as { total?: number }).total ?? 0, selectedSource.currency ?? "KES")}
                </p>
              </div>
              {hasLandedCostMultiCurrency && (
                <Button variant="outline" size="sm" onClick={applyCoolCatchPresets} className="w-full">
                  <Icons.Zap className="mr-2 h-4 w-4" />
                  Quick add: Permit + Border + Inbound freight
                </Button>
              )}
              <div className="space-y-3">
                <Label>Cost lines (permit, border, freight, etc.)</Label>
                {allocationLines.map((line, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 rounded border p-2">
                    <Select
                      value={line.templateId}
                      onValueChange={(v) => updateAllocationLine(idx, "templateId", v)}
                    >
                      <SelectTrigger className="min-w-[140px] flex-1">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {LANDED_COST_TYPE_LABELS[(t as { type?: string }).type] ?? (t as { name?: string }).name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="w-24"
                      value={line.amount}
                      onChange={(e) => updateAllocationLine(idx, "amount", e.target.value)}
                      min={0}
                      step={0.01}
                    />
                    {hasLandedCostMultiCurrency && (
                      <Select value={line.currency} onValueChange={(v) => updateAllocationLine(idx, "currency", v)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KES">KES</SelectItem>
                          <SelectItem value="UGX">UGX</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeAllocationLine(idx)} disabled={allocationLines.length <= 1}>
                      <Icons.X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addAllocationLine}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add another cost
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Costs allocate by weight across receipt lines. Set exchange rates in Settings → Finance for UGX/other currencies.
              </p>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAllocationOpen(false)} disabled={allocationSaving}>Cancel</Button>
            <Button onClick={handleSaveAllocation} disabled={allocationSaving}>
              {allocationSaving ? "Saving…" : "Save all"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
