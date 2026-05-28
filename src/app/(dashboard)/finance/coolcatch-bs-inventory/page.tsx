"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCoolcatchBsInventory, fetchBsMovements, type BsMovementRow } from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";

function formatKes(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);
}

export default function CoolcatchBsInventoryPage() {
  const [lines, setLines] = React.useState<
    Array<{ line: string; label: string; totalKg: number; totalValueKes: number }>
  >([]);
  const [movements, setMovements] = React.useState<BsMovementRow[]>([]);
  const [asOf, setAsOf] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [inv, mov] = await Promise.all([fetchCoolcatchBsInventory(), fetchBsMovements()]);
      setLines(inv.lines ?? []);
      setAsOf(inv.asOf ?? "");
      setMovements(mov.items ?? []);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load balance sheet inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalKg = lines.reduce((s, l) => s + l.totalKg, 0);
  const totalKes = lines.reduce((s, l) => s + l.totalValueKes, 0);

  return (
    <PageShell>
      <PageHeader
        title="CoolCatch BS inventory"
        description="Four live balance sheet inventory lines (In Processing, Warehouse, In Transit, Franchise)."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "BS inventory" }]}
        sticky
        actions={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Snapshot</CardTitle>
            <CardDescription>
              {asOf ? `As of ${new Date(asOf).toLocaleString("en-KE")}` : "Live totals"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Balance sheet line</TableHead>
                      <TableHead className="text-right">KG</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((row) => (
                      <TableRow key={row.line}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{row.totalKg.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatKes(row.totalValueKes)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatKes(totalKes)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent BS movements</CardTitle>
            <CardDescription>Trigger events moving inventory between lines.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No movements recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-right">KG</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString("en-KE")}
                      </TableCell>
                      <TableCell className="text-xs">{m.trigger}</TableCell>
                      <TableCell className="text-xs">
                        {m.fromLine ?? "—"} → {m.toLine ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">{m.qtyKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatKes(m.valueKes)}</TableCell>
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
