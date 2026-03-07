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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  fetchYieldRecords,
  fetchMassBalanceReport,
  createYieldRecord,
  type YieldRecordRow,
  type MassBalanceSummaryRow,
} from "@/lib/api/yield";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ManufacturingYieldPage() {
  const router = useRouter();
  const [records, setRecords] = React.useState<YieldRecordRow[]>([]);
  const [massBalance, setMassBalance] = React.useState<MassBalanceSummaryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recordYieldOpen, setRecordYieldOpen] = React.useState(false);
  const [yieldWorkOrderId, setYieldWorkOrderId] = React.useState("");
  const [yieldSubcontractId, setYieldSubcontractId] = React.useState("");
  const [yieldInputKg, setYieldInputKg] = React.useState("");
  const [yieldPrimaryKg, setYieldPrimaryKg] = React.useState("");
  const [yieldSecondaryKg, setYieldSecondaryKg] = React.useState("");
  const [yieldWasteKg, setYieldWasteKg] = React.useState("");
  const [yieldSaving, setYieldSaving] = React.useState(false);

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchYieldRecords(), fetchMassBalanceReport()])
      .then(([rec, mb]) => {
        setRecords(rec);
        setMassBalance(mb);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordYield = async () => {
    const inputKg = Number(yieldInputKg);
    const primaryKg = Number(yieldPrimaryKg);
    const secondaryKg = Number(yieldSecondaryKg);
    const wasteKg = Number(yieldWasteKg);
    if (Number.isNaN(inputKg) || inputKg <= 0) {
      toast.error("Enter a valid input weight (kg).");
      return;
    }
    const lines: { skuId: string; type: "PRIMARY" | "SECONDARY" | "WASTE"; quantityKg: number }[] = [];
    if (primaryKg > 0) lines.push({ skuId: "primary", type: "PRIMARY", quantityKg: primaryKg });
    if (secondaryKg > 0) lines.push({ skuId: "secondary", type: "SECONDARY", quantityKg: secondaryKg });
    if (wasteKg > 0) lines.push({ skuId: "waste", type: "WASTE", quantityKg: wasteKg });
    if (lines.length === 0) {
      toast.error("Enter at least one output (primary, secondary, or waste).");
      return;
    }
    setYieldSaving(true);
    try {
      await createYieldRecord({
        workOrderId: yieldWorkOrderId.trim() || undefined,
        subcontractOrderId: yieldSubcontractId.trim() || undefined,
        inputWeightKg: inputKg,
        lines,
      });
      toast.success("Yield record saved.");
      setRecordYieldOpen(false);
      setYieldWorkOrderId("");
      setYieldSubcontractId("");
      setYieldInputKg("");
      setYieldPrimaryKg("");
      setYieldSecondaryKg("");
      setYieldWasteKg("");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save yield.");
    } finally {
      setYieldSaving(false);
    }
  };

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
        accessor: (r: YieldRecordRow) => r.workOrderNumber ?? r.subcontractOrderId ?? "—",
      },
      { id: "inputKg", header: "Input (kg)", accessor: (r: YieldRecordRow) => r.inputWeightKg },
      { id: "primaryKg", header: "Primary (kg)", accessor: (r: YieldRecordRow) => r.outputPrimaryKg },
      { id: "secondaryKg", header: "Secondary (kg)", accessor: (r: YieldRecordRow) => r.outputSecondaryKg },
      { id: "wasteKg", header: "Waste (kg)", accessor: (r: YieldRecordRow) => r.wasteKg },
      {
        id: "yieldPct",
        header: "Yield %",
        accessor: (r: YieldRecordRow) => (r.yieldPercent != null ? `${r.yieldPercent}%` : "—"),
      },
    ],
    []
  );

  const massBalanceColumns = React.useMemo(
    () => [
      { id: "period", header: "Period", accessor: (r: MassBalanceSummaryRow) => r.period },
      { id: "workOrder", header: "Work order", accessor: (r: MassBalanceSummaryRow) => r.workOrderNumber ?? "—" },
      { id: "inputKg", header: "Input (kg)", accessor: (r: MassBalanceSummaryRow) => r.inputWeightKg },
      { id: "primaryKg", header: "Primary (kg)", accessor: (r: MassBalanceSummaryRow) => r.outputPrimaryKg },
      { id: "secondaryKg", header: "Secondary (kg)", accessor: (r: MassBalanceSummaryRow) => r.outputSecondaryKg },
      { id: "wasteKg", header: "Waste (kg)", accessor: (r: MassBalanceSummaryRow) => r.wasteKg },
      { id: "yieldPct", header: "Yield %", accessor: (r: MassBalanceSummaryRow) => `${r.yieldPercent}%` },
      {
        id: "variance",
        header: "Variance vs BOM",
        accessor: (r: MassBalanceSummaryRow) =>
          r.varianceVsBom != null ? (
            <span className={r.varianceVsBom < 0 ? "text-destructive" : ""}>{r.varianceVsBom}%</span>
          ) : (
            "—"
          ),
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Yield / Mass balance"
        description="Per-batch input weight, output primary/secondary, waste; reconcile to BOM"
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
        <Tabs defaultValue="records">
          <TabsList>
            <TabsTrigger value="records">Yield records</TabsTrigger>
            <TabsTrigger value="mass-balance">Mass balance report</TabsTrigger>
          </TabsList>
          <TabsContent value="records" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Yield records</CardTitle>
                <CardDescription>Input weight, output primary/secondary, waste per batch (work order or subcontract receive).</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <DataTable
                    data={records}
                    columns={yieldColumns}
                    onRowClick={(row) => router.push(`/manufacturing/yield/${row.id}`)}
                    emptyMessage="No yield records. Record from work order or subcontract receive."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="mass-balance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Mass balance report</CardTitle>
                <CardDescription>Input vs output vs BOM; variance by period or work order.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <DataTable data={massBalance} columns={massBalanceColumns} emptyMessage="No data." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={recordYieldOpen} onOpenChange={setRecordYieldOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Record yield</SheetTitle>
            <SheetDescription>Input weight and output primary/secondary/waste for this batch.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Work order ID (optional)</Label>
              <Input value={yieldWorkOrderId} onChange={(e) => setYieldWorkOrderId(e.target.value)} placeholder="e.g. wo1" />
            </div>
            <div className="space-y-2">
              <Label>Subcontract order ID (optional)</Label>
              <Input value={yieldSubcontractId} onChange={(e) => setYieldSubcontractId(e.target.value)} placeholder="e.g. sub1" />
            </div>
            <div className="space-y-2">
              <Label>Input weight (kg) *</Label>
              <Input type="number" min={0} step={0.01} value={yieldInputKg} onChange={(e) => setYieldInputKg(e.target.value)} placeholder="500" />
            </div>
            <div className="space-y-2">
              <Label>Output primary (kg)</Label>
              <Input type="number" min={0} step={0.01} value={yieldPrimaryKg} onChange={(e) => setYieldPrimaryKg(e.target.value)} placeholder="420" />
            </div>
            <div className="space-y-2">
              <Label>Output secondary (kg)</Label>
              <Input type="number" min={0} step={0.01} value={yieldSecondaryKg} onChange={(e) => setYieldSecondaryKg(e.target.value)} placeholder="55" />
            </div>
            <div className="space-y-2">
              <Label>Waste (kg)</Label>
              <Input type="number" min={0} step={0.01} value={yieldWasteKg} onChange={(e) => setYieldWasteKg(e.target.value)} placeholder="25" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRecordYieldOpen(false)} disabled={yieldSaving}>Cancel</Button>
            <Button onClick={handleRecordYield} disabled={yieldSaving}>{yieldSaving ? "Saving…" : "Save yield"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
