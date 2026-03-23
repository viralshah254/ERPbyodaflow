"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  fetchYieldRecords,
  fetchMassBalanceReport,
  createYieldRecord,
  type YieldRecordRow,
  type MassBalanceSummaryRow,
} from "@/lib/api/yield";
import {
  fetchSubcontractOrders,
  fetchReverseBoms,
  fetchExternalWorkCenters,
  type SubcontractOrderRow,
  type ExternalWorkCenterRow,
} from "@/lib/api/cool-catch";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { formatMoney } from "@/lib/money";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BomOutputLine {
  productId: string;
  productName?: string;
  type: "OUTPUT_PRIMARY" | "OUTPUT_SECONDARY" | "WASTE";
  expectedKg: number;
  actualKg: string; // controlled input
}

function lineTypeBadge(type: string) {
  if (type === "OUTPUT_PRIMARY" || type === "PRIMARY") return <Badge variant="default" className="text-xs">Primary</Badge>;
  if (type === "OUTPUT_SECONDARY" || type === "SECONDARY") return <Badge variant="secondary" className="text-xs">Secondary</Badge>;
  return <Badge variant="destructive" className="text-xs">Waste</Badge>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ManufacturingYieldPage() {
  const router = useRouter();

  // List/report state
  const [records, setRecords] = React.useState<YieldRecordRow[]>([]);
  const [massBalance, setMassBalance] = React.useState<MassBalanceSummaryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [mbSpeciesFilter, setMbSpeciesFilter] = React.useState("");
  const [mbProcessFilter, setMbProcessFilter] = React.useState("");
  const [mbWorkCenterFilter, setMbWorkCenterFilter] = React.useState("");
  const [workCenters, setWorkCenters] = React.useState<ExternalWorkCenterRow[]>([]);

  // Sheet state
  const [recordYieldOpen, setRecordYieldOpen] = React.useState(false);
  const [yieldSaving, setYieldSaving] = React.useState(false);

  // Smart form state
  const [subcontractOrders, setSubcontractOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [reverseBoms, setReverseBoms] = React.useState<Array<{ id: string; name: string; items: Array<{ productId: string; productName?: string; type: string; quantity: number }> }>>([]);
  const [selectedScoId, setSelectedScoId] = React.useState<string>("");
  const [inputKgOverride, setInputKgOverride] = React.useState<string>("");
  const [outputLines, setOutputLines] = React.useState<BomOutputLine[]>([]);

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchYieldRecords(dateFrom || dateTo ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } : undefined),
      fetchMassBalanceReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        species: mbSpeciesFilter || undefined,
        processType: mbProcessFilter || undefined,
        workCenterId: mbWorkCenterFilter || undefined,
      }),
      fetchExternalWorkCenters().then(setWorkCenters).catch(() => {}),
    ])
      .then(([rec, mb]) => { setRecords(rec); setMassBalance(mb); })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, mbSpeciesFilter, mbProcessFilter, mbWorkCenterFilter]);

  React.useEffect(() => { loadData(); }, [loadData]);

  // Load subcontract orders + BOMs when sheet opens
  React.useEffect(() => {
    if (!recordYieldOpen) return;
    Promise.all([
      fetchSubcontractOrders({ status: "WIP" }).then(setSubcontractOrders),
      fetchReverseBoms().then(setReverseBoms),
    ]).catch(() => {});
  }, [recordYieldOpen]);

  // When an SCO is selected, auto-populate input weight + BOM output lines
  React.useEffect(() => {
    if (!selectedScoId) { setOutputLines([]); return; }
    const sco = subcontractOrders.find((s) => s.id === selectedScoId);
    if (!sco) return;

    // Get input weight from the SCO's INPUT line
    const inputLine = (sco.lines ?? []).find((l) => l.type === "INPUT");
    const inputQty = inputLine?.quantity ?? 0;
    if (!inputKgOverride && inputQty > 0) setInputKgOverride(String(inputQty));

    // Get BOM
    const bom = reverseBoms.find((b) => b.id === sco.bomId);
    if (!bom) {
      // Fall back to using SCO output lines directly
      const scoOutputs: BomOutputLine[] = (sco.lines ?? [])
        .filter((l) => l.type === "OUTPUT_PRIMARY" || l.type === "OUTPUT_SECONDARY" || l.type === "WASTE")
        .map((l) => ({
          productId: l.productId ?? "",
          productName: l.productName,
          type: l.type as BomOutputLine["type"],
          expectedKg: l.quantity,
          actualKg: "",
        }));
      setOutputLines(scoOutputs);
      return;
    }

    const baseQty = 100;
    const scale = inputQty > 0 ? inputQty / baseQty : 1;
    // Build a productId → productName map from the SCO's own output lines (already resolved by the backend)
    const scoNameMap = new Map<string, string>();
    (sco.lines ?? []).forEach((l) => {
      if (l.productId && l.productName) scoNameMap.set(l.productId, l.productName);
    });
    const lines: BomOutputLine[] = bom.items.map((item) => {
      const lineType: BomOutputLine["type"] =
        item.type === "PRIMARY" ? "OUTPUT_PRIMARY" : item.type === "SECONDARY" ? "OUTPUT_SECONDARY" : "WASTE";
      return {
        productId: item.productId ?? "",
        productName: scoNameMap.get(item.productId ?? "") ?? item.productName ?? (item.productId ?? "").slice(-12),
        type: lineType,
        expectedKg: Math.round(item.quantity * scale * 100) / 100,
        actualKg: "",
      };
    });
    setOutputLines(lines);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScoId, subcontractOrders, reverseBoms]);

  const currentInputKg = Number(inputKgOverride) || 0;

  // Re-scale expected kg when input changes
  const scaledLines = React.useMemo(() => {
    if (!selectedScoId || !currentInputKg) return outputLines;
    const sco = subcontractOrders.find((s) => s.id === selectedScoId);
    const bom = sco?.bomId ? reverseBoms.find((b) => b.id === sco.bomId) : null;
    if (!bom) return outputLines;
    const scale = currentInputKg / 100;
    return outputLines.map((line, i) => ({
      ...line,
      expectedKg: Math.round((bom.items[i]?.quantity ?? 0) * scale * 100) / 100,
    }));
  }, [outputLines, currentInputKg, selectedScoId, subcontractOrders, reverseBoms]);

  const totalActualOutput = scaledLines.reduce((s, l) => {
    if (l.type === "WASTE") return s;
    return s + (Number(l.actualKg) || 0);
  }, 0);
  const processLossKg = currentInputKg > 0 ? currentInputKg - totalActualOutput - scaledLines.filter((l) => l.type === "WASTE").reduce((s, l) => s + (Number(l.actualKg) || 0), 0) : 0;

  const handleUpdateActual = (index: number, value: string) => {
    setOutputLines((prev) => prev.map((l, i) => (i === index ? { ...l, actualKg: value } : l)));
  };

  const handleRecordYield = async () => {
    if (!currentInputKg || currentInputKg <= 0) { toast.error("Enter a valid input weight (kg)."); return; }
    if (scaledLines.length === 0) { toast.error("Select a subcontract order with output lines."); return; }

    const lines = scaledLines.map((l) => ({
      skuId: l.productId,
      type: l.type === "OUTPUT_PRIMARY" ? "PRIMARY" as const : l.type === "OUTPUT_SECONDARY" ? "SECONDARY" as const : "WASTE" as const,
      quantityKg: Number(l.actualKg) || l.expectedKg,
    }));

    if (lines.every((l) => l.quantityKg <= 0)) { toast.error("Enter at least one output quantity."); return; }

    setYieldSaving(true);
    try {
      await createYieldRecord({
        subcontractOrderId: selectedScoId || undefined,
        inputWeightKg: currentInputKg,
        lines,
      });
      toast.success("Yield record saved.");
      setRecordYieldOpen(false);
      setSelectedScoId("");
      setInputKgOverride("");
      setOutputLines([]);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save yield.");
    } finally {
      setYieldSaving(false);
    }
  };

  // ── Table columns ───────────────────────────────────────────────────────────

  const yieldColumns = React.useMemo(
    () => [
      {
        id: "recordedAt",
        header: "Recorded",
        accessor: (r: YieldRecordRow) => new Date(r.recordedAt).toLocaleString(),
        sticky: true,
      },
      {
        id: "source",
        header: "Source",
        accessor: (r: YieldRecordRow) => r.subcontractOrderNumber ?? r.workOrderNumber ?? r.subcontractOrderId ?? "—",
      },
      { id: "inputKg", header: "Input (kg)", accessor: (r: YieldRecordRow) => r.inputWeightKg?.toFixed(2) ?? "—" },
      { id: "primaryKg", header: "Primary (kg)", accessor: (r: YieldRecordRow) => r.outputPrimaryKg?.toFixed(2) ?? "—" },
      { id: "secondaryKg", header: "Secondary (kg)", accessor: (r: YieldRecordRow) => r.outputSecondaryKg?.toFixed(2) ?? "—" },
      { id: "wasteKg", header: "Process loss (kg)", accessor: (r: YieldRecordRow) => r.wasteKg?.toFixed(2) ?? "—" },
      {
        id: "yieldPct",
        header: "Yield %",
        accessor: (r: YieldRecordRow) => (r.yieldPercent != null ? `${r.yieldPercent.toFixed(1)}%` : "—"),
      },
    ],
    []
  );

  const massBalanceColumns = React.useMemo(
    () => [
      {
        id: "alert",
        header: "",
        accessor: (r: MassBalanceSummaryRow) => {
          if (!r.alert || r.alert === "OK") return null;
          return (
            <Badge variant={r.alert === "ALERT" ? "destructive" : "secondary"} className="text-xs">
              {r.alert}
            </Badge>
          );
        },
      },
      { id: "period", header: "Period", accessor: (r: MassBalanceSummaryRow) => r.period },
      {
        id: "source",
        header: "Work order / SCO",
        accessor: (r: MassBalanceSummaryRow) => r.subcontractOrderNumber ?? r.workOrderNumber ?? "—",
      },
      {
        id: "species",
        header: "Species / Process",
        accessor: (r: MassBalanceSummaryRow) =>
          r.species ? `${r.species === "TILAPIA" ? "Tilapia" : "Nile Perch"}${r.processType ? ` · ${r.processType}` : ""}` : "—",
      },
      { id: "inputKg", header: "Input (kg)", accessor: (r: MassBalanceSummaryRow) => r.inputWeightKg?.toFixed(2) },
      { id: "primaryKg", header: "Primary (kg)", accessor: (r: MassBalanceSummaryRow) => r.outputPrimaryKg?.toFixed(2) },
      { id: "secondaryKg", header: "Secondary (kg)", accessor: (r: MassBalanceSummaryRow) => r.outputSecondaryKg?.toFixed(2) },
      {
        id: "processLoss",
        header: "Process loss (kg)",
        accessor: (r: MassBalanceSummaryRow) => {
          const loss = r.processLossKg ?? r.wasteKg;
          if (loss == null) return "—";
          const pct = r.inputWeightKg > 0 ? (loss / r.inputWeightKg) * 100 : null;
          return (
            <span>
              {loss.toFixed(2)}
              {pct != null ? <span className="text-muted-foreground text-xs ml-1">({pct.toFixed(1)}%)</span> : null}
            </span>
          );
        },
      },
      { id: "yieldPct", header: "Yield %", accessor: (r: MassBalanceSummaryRow) => `${r.yieldPercent?.toFixed(1) ?? "—"}%` },
      {
        id: "variance",
        header: "Primary variance vs BOM",
        accessor: (r: MassBalanceSummaryRow) => {
          const v = r.varianceVsBom;
          if (!v) return "—";
          const pct = v.primaryVariancePct;
          const color =
            pct == null ? ""
            : Math.abs(pct) > 10 ? "text-destructive font-medium"
            : Math.abs(pct) > 5 ? "text-yellow-600 font-medium"
            : "text-green-600";
          return (
            <span className={color}>
              {v.primaryVarianceKg > 0 ? "+" : ""}{v.primaryVarianceKg.toFixed(2)} kg
              {pct != null ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Yield / Mass balance"
        description="Record actual outputs per batch; compare to BOM-expected. Process loss = input − primary − secondary."
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Yield" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => setRecordYieldOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Record yield
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Date range filter */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" className="w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" className="w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <Icons.Search className="mr-2 h-3 w-3" />
            Filter
          </Button>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
          )}
        </div>

        <Tabs defaultValue="records">
          <TabsList>
            <TabsTrigger value="records">Yield records</TabsTrigger>
            <TabsTrigger value="mass-balance">Mass balance report</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Yield records</CardTitle>
                <CardDescription>
                  Actual input weight and output by SKU (primary finished goods, secondary sellable byproducts, and process loss).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <DataTable
                    data={records}
                    columns={yieldColumns}
                    onRowClick={(row) => router.push(`/manufacturing/yield/${row.id}`)}
                    emptyMessage="No yield records. Click 'Record yield' to add one."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mass-balance" className="mt-4 space-y-4">
            {/* Mass balance filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={mbSpeciesFilter || "all"} onValueChange={(v) => setMbSpeciesFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All species</SelectItem>
                  <SelectItem value="TILAPIA">Tilapia</SelectItem>
                  <SelectItem value="NILE_PERCH">Nile Perch</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mbProcessFilter || "all"} onValueChange={(v) => setMbProcessFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All processes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All processes</SelectItem>
                  <SelectItem value="FILLETING">Filleting</SelectItem>
                  <SelectItem value="GUTTING">Gutting</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mbWorkCenterFilter || "all"} onValueChange={(v) => setMbWorkCenterFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All work centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All work centers</SelectItem>
                  {workCenters.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadData}>
                <Icons.Search className="mr-2 h-3 w-3" />
                Apply
              </Button>
            </div>

            {/* Alert summary */}
            {massBalance.some((r) => r.alert && r.alert !== "OK") && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm">
                <Icons.AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span>
                  <span className="font-medium text-destructive">
                    {massBalance.filter((r) => r.alert === "ALERT").length} alert(s)
                  </span>
                  {massBalance.filter((r) => r.alert === "WARNING").length > 0 && (
                    <>, <span className="font-medium text-yellow-700">{massBalance.filter((r) => r.alert === "WARNING").length} warning(s)</span></>
                  )}
                  {" "}— primary yield deviating beyond tolerance ({">"}5% = warning, {">"}10% = alert).
                </span>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Mass balance report</CardTitle>
                <CardDescription>
                  Input vs actual output per SKU vs BOM-expected. Negative primary variance = yield below standard — investigate batch or processor.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <DataTable
                    data={massBalance}
                    columns={massBalanceColumns}
                    emptyMessage="No data. Record yield batches to populate the mass balance."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Record Yield Sheet ── */}
      <Sheet open={recordYieldOpen} onOpenChange={setRecordYieldOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record yield</SheetTitle>
            <SheetDescription>
              Select a WIP subcontract order. Output lines are pre-populated from the BOM. Enter actual kg received per product. Process loss is calculated automatically.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Subcontract order selector */}
            <div className="space-y-2">
              <Label>Subcontract order (WIP)</Label>
              <Select value={selectedScoId || ""} onValueChange={(v) => { setSelectedScoId(v); setInputKgOverride(""); setOutputLines([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order in WIP status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Manual entry —</SelectItem>
                  {subcontractOrders.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.number} · {s.workCenterName}
                      {s.species ? ` · ${s.species === "TILAPIA" ? "Tilapia" : "Nile Perch"}` : ""}
                      {s.processType ? ` · ${s.processType}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input weight */}
            <div className="space-y-2">
              <Label>Input weight (kg) *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Weight received at processing facility"
                value={inputKgOverride}
                onChange={(e) => setInputKgOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is the GRN&apos;s received weight at facility — the authoritative input for the mass balance.
              </p>
            </div>

            {/* Output lines */}
            {scaledLines.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Actual outputs</p>
                  <p className="text-xs text-muted-foreground">Expected values from BOM shown — enter actual kg received per SKU.</p>

                  {scaledLines.map((line, i) => (
                    <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        {lineTypeBadge(line.type)}
                        <span className="text-xs text-muted-foreground font-mono">{line.productId.slice(-12)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Expected (kg)</Label>
                          <div className="text-sm font-medium">{line.expectedKg.toFixed(2)}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Actual (kg) *</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder={line.expectedKg.toFixed(2)}
                            value={line.actualKg}
                            onChange={(e) => handleUpdateActual(i, e.target.value)}
                          />
                        </div>
                      </div>
                      {line.actualKg && Number(line.actualKg) !== line.expectedKg && line.type !== "WASTE" && (
                        <div className="text-xs">
                          Variance:{" "}
                          <span className={Number(line.actualKg) < line.expectedKg ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                            {(Number(line.actualKg) - line.expectedKg).toFixed(2)} kg
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Process loss summary */}
                  {currentInputKg > 0 && (
                    <div className="rounded-md border bg-background p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Input weight</span>
                        <span className="font-medium">{currentInputKg.toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Primary output</span>
                        <span>{scaledLines.filter((l) => l.type === "OUTPUT_PRIMARY").reduce((s, l) => s + (Number(l.actualKg) || 0), 0).toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Secondary (byproduct)</span>
                        <span>{scaledLines.filter((l) => l.type === "OUTPUT_SECONDARY").reduce((s, l) => s + (Number(l.actualKg) || 0), 0).toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Waste / Process loss</span>
                        <span>{scaledLines.filter((l) => l.type === "WASTE").reduce((s, l) => s + (Number(l.actualKg) || 0), 0).toFixed(2)} kg</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Unaccounted loss</span>
                        <span className={processLossKg > 0 ? "text-destructive" : "text-green-600"}>
                          {Math.max(0, processLossKg).toFixed(2)} kg
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Manual mode: no SCO selected */}
            {!selectedScoId && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                Select a WIP subcontract order above to auto-populate output lines from BOM, or continue with manual entry.
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRecordYieldOpen(false)} disabled={yieldSaving}>Cancel</Button>
            <Button onClick={handleRecordYield} disabled={yieldSaving || !currentInputKg || (scaledLines.length === 0 && !selectedScoId)}>
              {yieldSaving ? "Saving…" : "Save yield"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
