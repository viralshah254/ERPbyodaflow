"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { fetchYieldById } from "@/lib/api/yield";
import type { YieldRecordRow } from "@/lib/api/yield";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

export default function YieldDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const [record, setRecord] = React.useState<YieldRecordRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchYieldById(id).then((r) => { setRecord(r ?? null); setLoading(false); });
  }, [id]);

  if (loading && !record) {
    return (
      <PageShell>
        <PageHeader title="Yield" breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: "Yield", href: "/manufacturing/yield" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }
  if (record === null) {
    return (
      <PageShell>
        <PageHeader title="Yield not found" breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: "Yield", href: "/manufacturing/yield" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Yield record not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/manufacturing/yield">Back to yield</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`Yield ${record.id}`}
        description={record.workOrderNumber ?? record.subcontractOrderId ?? record.recordedAt}
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Yield", href: "/manufacturing/yield" },
          { label: record.id },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/yield">Back to list</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Yield Record Summary</CardTitle>
                <CardDescription>Transformation from raw input into sellable outputs and byproducts.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Recorded</p>
                  <p className="font-medium">{new Date(record.recordedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium">{record.workOrderNumber ?? record.subcontractOrderId ?? "Manual"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ownership / Location</p>
                  <OwnershipLocationBadge owner="CoolCatch" location={record.subcontractOrderId ? "Processor return" : "Production"} />
                </div>
                <div>
                  <p className="text-muted-foreground">Yield %</p>
                  <p className="font-medium">{record.yieldPercent != null ? `${record.yieldPercent}%` : "—"}</p>
                </div>
              </CardContent>
            </Card>

            <YieldBreakdownCard
              inputKg={record.inputWeightKg}
              primaryKg={record.outputPrimaryKg}
              secondaryKg={record.outputSecondaryKg}
              lossKg={record.wasteKg}
            />

            <Card>
              <CardHeader>
                <CardTitle>Output lines</CardTitle>
                <CardDescription>Primary, secondary, and waste by SKU.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<(typeof record.lines)[number]>
                  data={record.lines}
                  columns={[
                    { id: "sku", header: "SKU", accessor: (line: (typeof record.lines)[number]) => line.skuCode, sticky: true },
                    { id: "product", header: "Product", accessor: (line: (typeof record.lines)[number]) => line.productName },
                    { id: "type", header: "Type", accessor: (line: (typeof record.lines)[number]) => <Badge variant={line.type === "PRIMARY" ? "default" : "secondary"}>{line.type}</Badge> },
                    { id: "qty", header: "Quantity (kg)", accessor: (line: (typeof record.lines)[number]) => `${line.quantityKg} ${line.uom}` },
                  ]}
                  emptyMessage="No output lines."
                />
              </CardContent>
            </Card>

            <CostImpactPanel
              title="Yield Valuation Preview"
              quantityKg={record.inputWeightKg}
              currency="KES"
              lines={[
                { label: "Primary output value proxy", amount: record.outputPrimaryKg * 480 },
                { label: "Secondary output value proxy", amount: record.outputSecondaryKg * 220 },
                { label: "Waste handling / loss", amount: record.wasteKg * 25 },
              ]}
            />
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Yield Lifecycle"
              steps={[
                { id: "input", label: "Input batch received", status: "completed" },
                { id: "process", label: "Processing completed", status: "completed", timestamp: record.recordedAt },
                { id: "record", label: "Yield recorded", status: "completed", timestamp: record.recordedAt },
                { id: "cost", label: "Valuation / finance review", status: "current", detail: "Awaiting final costing run" },
              ]}
            />
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={[
                    { id: "1", action: "Yield captured", user: "Processing Coordinator", timestamp: new Date(record.recordedAt).toLocaleString(), detail: `${record.inputWeightKg} kg input recorded` },
                    { id: "2", action: "Mass balance calculated", user: "System", timestamp: new Date().toLocaleString(), detail: `Yield ${record.yieldPercent ?? "—"}%` },
                  ]}
                  comments={[
                    { id: "c1", user: "Finance", text: "Review byproduct valuation before journal posting.", timestamp: new Date().toLocaleString() },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
