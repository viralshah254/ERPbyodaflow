"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchDispatchAlerts, type DispatchAlert } from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";

export default function DispatchAlertsPage() {
  const [hours, setHours] = React.useState("4");
  const [items, setItems] = React.useState<DispatchAlert[]>([]);
  const [thresholdHours, setThresholdHours] = React.useState(4);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const h = Math.max(1, Number(hours) || 4);
      const data = await fetchDispatchAlerts(h);
      setItems(data.items ?? []);
      setThresholdHours(data.thresholdHours ?? h);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load dispatch alerts.");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PageShell>
      <PageHeader
        title="Dispatch alerts"
        description="Dispatches unacknowledged by franchise intake beyond the threshold."
        breadcrumbs={[
          { label: "Operations", href: "/operations/supply-chain" },
          { label: "Dispatch alerts" },
        ]}
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
            <CardTitle>Unacknowledged deliveries</CardTitle>
            <CardDescription>
              Showing dispatches older than {thresholdHours} hours without franchise intake step 1.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4 max-w-xs">
              <div className="space-y-2 flex-1">
                <Label htmlFor="hours-threshold">Threshold (hours)</Label>
                <Input
                  id="hours-threshold"
                  type="number"
                  min={1}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={() => void refresh()}>
                Apply
              </Button>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No unacknowledged dispatches above threshold.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery note</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead className="text-right">Dispatched kg</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.deliveryNoteId}>
                      <TableCell className="font-mono text-xs">
                        {row.number ?? row.deliveryNoteId}
                      </TableCell>
                      <TableCell>{row.outletName ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.dispatchedKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.hoursUnacknowledged.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sales/deliveries?highlight=${row.deliveryNoteId}`}>
                            View
                          </Link>
                        </Button>
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
