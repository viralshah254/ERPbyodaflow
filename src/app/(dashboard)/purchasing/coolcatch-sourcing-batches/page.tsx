"use client";

import * as React from "react";
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
import { fetchSourcingBatches, type SourcingBatchRow } from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";
import { useCanWritePurchasing } from "@/lib/rbac/use-write-guard";

export default function CoolcatchSourcingBatchesPage() {
  const canWrite = useCanWritePurchasing();
  const [items, setItems] = React.useState<SourcingBatchRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows } = await fetchSourcingBatches();
      setItems(rows ?? []);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PageShell>
      <PageHeader
        title="CoolCatch sourcing batches"
        description="Audit trail of sourcing batches with EMP/kg at entry."
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Sourcing batches" },
        ]}
        sticky
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/purchasing/coolcatch-sourcing">New batch</Link>
              </Button>
            )}
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent batches</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sourcing batches yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Input kg</TableHead>
                    <TableHead className="text-right">Sellable kg</TableHead>
                    <TableHead className="text-right">EMP/kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.batchNumber}</TableCell>
                      <TableCell>{row.sourcingDate}</TableCell>
                      <TableCell className="text-xs">{row.sourcingModel}</TableCell>
                      <TableCell>{row.supplierName ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.inputKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.sellableKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        {row.empPerKg.toLocaleString()} KES
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
