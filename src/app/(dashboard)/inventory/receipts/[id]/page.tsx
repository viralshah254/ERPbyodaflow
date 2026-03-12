"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { StockAgeIndicator } from "@/components/operational/StockAgeIndicator";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { fetchGRNById, postGRN, exportGRNDetailCsv, exportGRNPdf, type GrnDetailRow } from "@/lib/api/grn";
import type { GrnLineRow } from "@/lib/mock/purchasing";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const [grn, setGrn] = React.useState<GrnDetailRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetchGRNById(id).then((g) => { setGrn(g ?? null); setLoading(false); });
  }, [id]);

  if (loading && !grn) {
    return (
      <PageShell>
        <PageHeader title="Receipt" breadcrumbs={[{ label: "Inventory", href: "/inventory/products" }, { label: "Receipts", href: "/inventory/receipts" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }
  if (grn === null) {
    return (
      <PageShell>
        <PageHeader title="Receipt not found" breadcrumbs={[{ label: "Inventory", href: "/inventory/products" }, { label: "Receipts", href: "/inventory/receipts" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">GRN not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/inventory/receipts">Back to receipts</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const totalReceivedWeight = grn.lines.reduce((acc, line) => acc + (line.receivedWeightKg ?? 0), 0);
  const totalPaidWeight = grn.lines.reduce((acc, line) => acc + (line.paidWeightKg ?? 0), 0);
  const totalQty = grn.lines.reduce((acc, line) => acc + line.qty, 0);
  const lineColumns = [
    { id: "sku", header: "SKU", accessor: (line: GrnLineRow) => line.sku, sticky: true },
    { id: "product", header: "Product", accessor: (line: GrnLineRow) => line.productName },
    { id: "qty", header: "Qty", accessor: (line: GrnLineRow) => `${line.qty} ${line.uom}` },
    { id: "value", header: "Value", accessor: (line: GrnLineRow) => formatMoney(line.value, grn.currency ?? "KES") },
    ...(hasCashWeightAudit
      ? [
          { id: "receivedWeightKg", header: "Received kg", accessor: (line: GrnLineRow) => line.receivedWeightKg ?? "—" },
          { id: "paidWeightKg", header: "Paid kg", accessor: (line: GrnLineRow) => line.paidWeightKg ?? "—" },
        ]
      : []),
  ];

  return (
    <PageShell>
      <PageHeader
        title={grn.number}
        description={`${grn.date} · ${grn.warehouse ?? "—"}`}
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Receipts", href: "/inventory/receipts" },
          { label: grn.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {grn.status !== "POSTED" && (
              <Button
                size="sm"
                disabled={posting}
                onClick={async () => {
                  setPosting(true);
                  await postGRN(grn.id);
                  setGrn(await fetchGRNById(grn.id));
                  setPosting(false);
                  toast.success("GRN posted.");
                }}
              >
                <Icons.Send className="mr-2 h-4 w-4" />
                {posting ? "Posting…" : "Post"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => exportGRNDetailCsv(grn)}>
              <Icons.FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportGRNPdf(grn.id, (message) => toast.info(message))}>
              <Icons.FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            {hasCashWeightAudit && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/purchasing/cash-weight-audit">Cash-to-weight audit</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory/receipts">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {hasCashWeightAudit && totalReceivedWeight !== totalPaidWeight ? (
          <ExceptionBanner
            type="warning"
            title="Weight variance detected"
            description="Received and paid weights do not match. Review before final finance sign-off."
            actions={[
              { label: "Open audit", onClick: () => { window.location.href = "/purchasing/cash-weight-audit"; } },
            ]}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Summary</CardTitle>
            <CardDescription>Goods receipt object page with operational, variance, and valuation context.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Number</p>
              <p className="font-medium">{grn.number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{grn.date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PO Reference</p>
              <p className="font-medium">{grn.poRef ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Warehouse</p>
              <p className="font-medium">{grn.warehouse ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Supplier</p>
              <p className="font-medium">{grn.supplier ?? grn.party ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={grn.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{grn.totalAmount != null && grn.currency ? formatMoney(grn.totalAmount, grn.currency) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ownership / Location</p>
              <OwnershipLocationBadge owner="CoolCatch" location={grn.warehouse ?? "Warehouse"} />
            </div>
            <div>
              <p className="text-muted-foreground">Stock age</p>
              <StockAgeIndicator days={grn.status === "POSTED" ? 2 : 0} />
            </div>
          </CardContent>
        </Card>

            {hasCashWeightAudit ? (
              <ProcurementVariancePanel
                poWeightKg={totalQty}
                paidWeightKg={totalPaidWeight}
                receivedWeightKg={totalReceivedWeight}
              />
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Receipt Lines</CardTitle>
                <CardDescription>Received quantity and financial value per line.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<GrnLineRow> data={grn.lines} columns={lineColumns} emptyMessage="No receipt lines." />
              </CardContent>
            </Card>

            <CostImpactPanel
              title="Receipt Cost Impact"
              currency={grn.currency ?? "KES"}
              quantityKg={totalReceivedWeight || totalQty}
              lines={[
                { label: "Receipt value", amount: grn.totalAmount ?? 0 },
                { label: "Inbound handling", amount: (grn.totalAmount ?? 0) * 0.015 },
                { label: "Cold-chain storage estimate", amount: (grn.totalAmount ?? 0) * 0.01 },
              ]}
            />
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Receipt Timeline"
              steps={[
                { id: "po", label: "Purchase order approved", status: "completed", detail: grn.poRef ?? "PO linked" },
                { id: "arrive", label: "Stock arrived at facility", status: "completed", timestamp: `${grn.date}T08:00:00Z` },
                { id: "verify", label: "Weight / QA verification", status: hasCashWeightAudit ? "current" : "completed", detail: hasCashWeightAudit ? "Compare paid vs received weight" : "Verification complete" },
                { id: "post", label: "Receipt posted to inventory", status: grn.status === "POSTED" ? "completed" : "upcoming" },
              ]}
            />

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={[
                    { id: "a1", action: "GRN created", user: "Warehouse Clerk", timestamp: grn.date, detail: `${grn.number} for ${grn.supplier ?? grn.party}` },
                    { id: "a2", action: grn.status === "POSTED" ? "GRN posted" : "Awaiting posting", user: "System", timestamp: new Date().toISOString(), detail: `Warehouse ${grn.warehouse ?? "—"}` },
                  ]}
                  comments={[
                    { id: "c1", user: "QA", text: "Verify weights against farm-gate payment before closure.", timestamp: new Date().toLocaleString() },
                  ]}
                  attachments={[
                    { id: "f1", name: "weighbridge-slip.jpg", type: "image", size: "1.2 MB", uploadedBy: "Receiving", uploadedAt: grn.date },
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
