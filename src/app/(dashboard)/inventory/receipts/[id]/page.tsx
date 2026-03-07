"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchGRNById, type GrnDetailRow } from "@/lib/api/grn";
import type { GrnLineRow } from "@/lib/mock/purchasing";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const hasCashWeightAudit = useOrgContextStore((s) => s.hasFlag?.("procurementAuditCashWeight") ?? false);
  const [grn, setGrn] = React.useState<GrnDetailRow | null>(null);
  const [loading, setLoading] = React.useState(true);

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
        <Card>
          <CardHeader>
            <CardTitle>Header</CardTitle>
            <CardDescription>Goods receipt details</CardDescription>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
            <CardDescription>Received quantity and weight (when cash-to-weight audit is enabled)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Value</TableHead>
                  {hasCashWeightAudit && (
                    <>
                      <TableHead>Received weight (kg)</TableHead>
                      <TableHead>Paid weight (kg)</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.lines.map((line: GrnLineRow) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">{line.sku}</TableCell>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.qty}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell>{formatMoney(line.value, grn.currency ?? "KES")}</TableCell>
                    {hasCashWeightAudit && (
                      <>
                        <TableCell>{line.receivedWeightKg != null ? line.receivedWeightKg : "—"}</TableCell>
                        <TableCell>{line.paidWeightKg != null ? line.paidWeightKg : "—"}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
