"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { fetchSubcontractOrderById, receiveSubcontractOrder } from "@/lib/api/cool-catch";
import type { SubcontractOrderLineRow } from "@/lib/mock/manufacturing/subcontracting";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function SubcontractOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = React.useState<Awaited<ReturnType<typeof fetchSubcontractOrderById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [receiving, setReceiving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchSubcontractOrderById(id)
      .then((r) => { if (!cancelled) setOrder(r); })
      .catch(() => { if (!cancelled) setOrder(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleReceive = async () => {
    if (!order || order.status !== "WIP") return;
    setReceiving(true);
    try {
      await receiveSubcontractOrder(order.id);
      toast.success("Order marked received.");
      const updated = await fetchSubcontractOrderById(id);
      setOrder(updated);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceiving(false);
    }
  };

  const lineColumns = [
    { id: "type", header: "Type", accessor: (r: SubcontractOrderLineRow) => r.type, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: SubcontractOrderLineRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: SubcontractOrderLineRow) => r.productName },
    { id: "quantity", header: "Qty", accessor: (r: SubcontractOrderLineRow) => `${r.quantity} ${r.uom}` },
    { id: "fee", header: "Fee/unit", accessor: (r: SubcontractOrderLineRow) => r.processingFeePerUnit != null ? formatMoney(r.processingFeePerUnit, "KES") : "—" },
    { id: "amount", header: "Amount", accessor: (r: SubcontractOrderLineRow) => r.amount != null ? formatMoney(r.amount, "KES") : "—" },
  ];

  if (loading) {
    return (
      <PageShell>
        <PageHeader title="Subcontract order" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/subcontracting" }, { label: "Subcontracting" }, { label: id }]} />
        <div className="p-6"><p className="text-muted-foreground text-sm">Loading…</p></div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <PageHeader title="Order not found" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/subcontracting" }, { label: "Subcontracting" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Subcontract order not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/manufacturing/subcontracting">Back to Subcontracting</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={order.number}
        description={`${order.workCenterName} · ${order.status}`}
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Subcontracting", href: "/manufacturing/subcontracting" },
          { label: order.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {order.status === "WIP" && (
              <Button size="sm" disabled={receiving} onClick={handleReceive}>
                {receiving ? "Receiving…" : "Receive"}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/subcontracting">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Header</CardTitle>
            <Badge>{order.status}</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Work center: {order.workCenterName}</p>
            <p>BOM: {order.bomName ?? "—"}</p>
            <p>Sent: {order.sentAt ?? "—"} · Received: {order.receivedAt ?? "—"}</p>
            <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
          </CardContent>
        </Card>
        {order.lines && order.lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lines (input / output)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={order.lines} columns={lineColumns} emptyMessage="No lines." />
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
