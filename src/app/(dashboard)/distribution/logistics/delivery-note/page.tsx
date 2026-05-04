"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchOutboundLogisticsForDeliveryNote,
  type OutboundLogisticsAllocationRow,
} from "@/lib/api/logistics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function LogisticsDeliveryNoteOutboundPage() {
  const [dnId, setDnId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<OutboundLogisticsAllocationRow[]>([]);
  const [totalsByLineId, setTotalsByLineId] = React.useState<Record<string, number>>({});

  const load = async () => {
    const id = dnId.trim();
    if (!id) {
      toast.error("Paste a delivery note document id.");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchOutboundLogisticsForDeliveryNote(id);
      setItems(data.items ?? []);
      setTotalsByLineId(data.totalsByLineId ?? {});
      if (!data.items?.length) {
        toast.message("No outbound logistics rows yet for this note.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load allocations.");
      setItems([]);
      setTotalsByLineId({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Delivery note outbound freight"
      description="Allocated provisional outbound logistics after trips complete (tie line amounts to invoiced COGS clearing)."
      breadcrumbs={[
        { label: "Distribution", href: "/distribution/trips" },
        { label: "Outbound logistics" },
      ]}
    >
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Lookup delivery note</CardTitle>
            <CardDescription>
              Use the document id from the delivery note detail URL or ERP document list — this is outbound allocation only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="dn-id">Delivery note id</Label>
              <Input
                id="dn-id"
                placeholder="e.g. …uuid…"
                value={dnId}
                onChange={(e) => setDnId(e.target.value)}
              />
            </div>
            <Button type="button" onClick={() => void load()} disabled={loading}>
              {loading ? "Loading…" : "Load"}
            </Button>
          </CardContent>
        </Card>

        {Object.keys(totalsByLineId).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Totals by line</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 font-mono">
                {Object.entries(totalsByLineId).map(([lineId, kes]) => (
                  <li key={lineId} className="flex justify-between gap-4">
                    <span className="truncate">{lineId}</span>
                    <span>{formatMoney(kes, "KES")}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Allocation rows</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Trip</th>
                    <th className="py-2 pr-3">Line</th>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3 text-right">Provisional</th>
                    <th className="py-2 pr-3 text-right">Adjustment</th>
                    <th className="py-2 text-right">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-muted/60">
                      <td className="py-2 pr-3 font-mono text-xs max-w-[8rem] truncate">{row.tripId}</td>
                      <td className="py-2 pr-3 font-mono text-xs max-w-[8rem] truncate">{row.lineId}</td>
                      <td className="py-2 pr-3 font-mono text-xs max-w-[7rem] truncate">{row.vehicleId}</td>
                      <td className="py-2 pr-3">{row.periodKey}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatMoney(row.provisionalKes ?? 0, "KES")}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatMoney(row.adjustmentKes ?? 0, "KES")}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoney(row.finalKes ?? row.provisionalKes ?? 0, "KES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
