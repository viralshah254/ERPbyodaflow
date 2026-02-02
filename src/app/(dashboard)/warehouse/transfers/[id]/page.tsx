"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getMockTransfers, type TransferRow } from "@/lib/mock/warehouse/transfers";
import { DocumentTimeline } from "@/components/docs/DocumentTimeline";
import * as Icons from "lucide-react";

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "RECEIVED") return "secondary";
  if (s === "DRAFT") return "outline";
  return "default";
}

export default function TransferDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const transfer = React.useMemo(() => getMockTransfers().find((t) => t.id === id), [id]);

  if (!transfer) {
    return (
      <PageShell>
        <PageHeader title="Transfer not found" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Transfers", href: "/warehouse/transfers" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Transfer not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/transfers">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const t = transfer as TransferRow;
  const canApprove = t.status === "DRAFT";
  const canTransit = t.status === "APPROVED";
  const canReceive = t.status === "IN_TRANSIT";

  return (
    <PageShell>
      <PageHeader
        title={`Transfer ${t.number}`}
        description={`${t.fromWarehouse} → ${t.toWarehouse}`}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Transfers", href: "/warehouse/transfers" },
          { label: t.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {canApprove && <Button size="sm" onClick={() => window.alert("Approve (stub)")}>Approve</Button>}
            {canTransit && <Button size="sm" onClick={() => window.alert("Mark in transit (stub)")}>Mark in transit</Button>}
            {canReceive && <Button size="sm" onClick={() => window.alert("Receive (stub)")}>Receive</Button>}
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/transfers">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Header</CardTitle>
            <Badge variant={statusVariant(t.status)}>{t.status.replace("_", " ")}</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t.number} · {t.date} · {t.fromWarehouse} → {t.toWarehouse}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.sku}</TableCell>
                    <TableCell>{l.productName}</TableCell>
                    <TableCell>{l.quantity}</TableCell>
                    <TableCell>{l.unit ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentTimeline
              entries={
                t.status === "DRAFT"
                  ? [{ id: "1", action: "Created", by: "System", at: t.createdAt ?? t.date }]
                  : [
                      { id: "1", action: "Created", by: "System", at: t.createdAt ?? t.date },
                      { id: "2", action: "Approved", by: "Jane Doe", at: "2025-01-25T10:00:00Z" },
                    ]
              }
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
