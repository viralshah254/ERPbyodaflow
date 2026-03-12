"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { fetchCashWeightAuditLines } from "@/lib/api/cool-catch";

type ReceivingQueueRow = {
  id: string;
  poNumber: string;
  sku: string;
  productName: string;
  expectedWeightKg: number;
  paidWeightKg: number | null;
  receivedWeightKg: number | null;
  status: "PENDING" | "VARIANCE" | "MATCHED";
};

export default function InventoryReceivingQueuePage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<ReceivingQueueRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCashWeightAuditLines()
      .then((data) => {
        if (cancelled) return;
        setRows(
          data.map((d) => ({
            id: d.id,
            poNumber: d.poNumber,
            sku: d.sku,
            productName: d.productName,
            expectedWeightKg: d.orderedQty,
            paidWeightKg: d.paidWeightKg,
            receivedWeightKg: d.receivedWeightKg,
            status: d.status,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { id: "po", header: "PO", accessor: (r: ReceivingQueueRow) => r.poNumber, sticky: true },
    {
      id: "sku",
      header: "SKU",
      accessor: (r: ReceivingQueueRow) => (
        <div>
          <div className="font-medium">{r.sku}</div>
          <div className="text-xs text-muted-foreground">{r.productName}</div>
        </div>
      ),
    },
    { id: "expected", header: "Expected kg", accessor: (r: ReceivingQueueRow) => r.expectedWeightKg },
    { id: "paid", header: "Paid kg", accessor: (r: ReceivingQueueRow) => r.paidWeightKg ?? "—" },
    { id: "received", header: "Received kg", accessor: (r: ReceivingQueueRow) => r.receivedWeightKg ?? "—" },
    {
      id: "status",
      header: "Status",
      accessor: (r: ReceivingQueueRow) => (
        <Badge variant={r.status === "VARIANCE" ? "destructive" : r.status === "MATCHED" ? "default" : "secondary"}>
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Receiving Queue"
        description="Queue of inbound lines awaiting weigh-in or variance resolution."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/receipts" }, { label: "Receiving Queue" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/purchasing/cash-weight-audit">Cash-to-Weight Audit</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/receipts">Open GRN List</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <div className="mb-6">
          <ProcurementVariancePanel
            poWeightKg={rows.reduce((a, r) => a + r.expectedWeightKg, 0)}
            paidWeightKg={rows.reduce((a, r) => a + (r.paidWeightKg ?? 0), 0)}
            receivedWeightKg={rows.reduce((a, r) => a + (r.receivedWeightKg ?? 0), 0)}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Inbound receiving queue</CardTitle>
            <CardDescription>Rows marked as variance should be reviewed before posting final receipt.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading receiving queue…</div>
            ) : (
              <DataTable
                data={rows}
                columns={columns}
                onRowClick={() => router.push("/inventory/receipts")}
                emptyMessage="No receiving queue rows."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

