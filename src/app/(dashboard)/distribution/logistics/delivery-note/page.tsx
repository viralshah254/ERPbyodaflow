"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { fetchDocumentDetailApi } from "@/lib/api/documents";
import {
  fetchDistributionVehicles,
  fetchOutboundLogisticsForDeliveryNote,
  type OutboundLogisticsAllocationRow,
} from "@/lib/api/logistics";
import { fetchTrips } from "@/lib/api/trips";
import { searchDocumentOptions } from "@/lib/lookups/named-options";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function LogisticsDeliveryNoteOutboundPage() {
  const [dnId, setDnId] = React.useState("");
  const [noteOption, setNoteOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<OutboundLogisticsAllocationRow[]>([]);
  const [totalsByLineId, setTotalsByLineId] = React.useState<Record<string, number>>({});
  const [lineNames, setLineNames] = React.useState<Record<string, string>>({});
  const [tripNames, setTripNames] = React.useState<Record<string, string>>({});
  const [vehicleNames, setVehicleNames] = React.useState<Record<string, string>>({});

  const named = (map: Record<string, string>, id: string | undefined, fallback: string) => {
    if (!id) return "—";
    return map[id] ?? fallback;
  };

  const load = async () => {
    const id = dnId.trim();
    if (!id) {
      toast.error("Choose a delivery note.");
      return;
    }
    setLoading(true);
    try {
      const [data, detail, trips, vehicles] = await Promise.all([
        fetchOutboundLogisticsForDeliveryNote(id),
        fetchDocumentDetailApi("delivery-note", id, { include: ["core"] }).catch(() => null),
        fetchTrips().catch(() => []),
        fetchDistributionVehicles().catch(() => []),
      ]);
      const lines: Record<string, string> = {};
      for (const line of detail?.lines ?? []) {
        if (!line.id) continue;
        const title = [line.productSku, line.productName || line.description].filter(Boolean).join(" · ");
        lines[line.id] = title || "Line";
      }
      setLineNames(lines);
      setTripNames(Object.fromEntries(trips.map((trip) => [trip.id, trip.reference || "Trip"])));
      setVehicleNames(Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle.name || vehicle.code || "Vehicle"])));
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
              Search the delivery note by number or customer. This view is the outbound freight allocated to that note.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Delivery note</Label>
              <AsyncSearchableSelect
                value={dnId}
                onValueChange={(value) => {
                  setDnId(value);
                  if (!value) setNoteOption(null);
                }}
                onOptionSelect={setNoteOption}
                loadOptions={(query) => searchDocumentOptions(["delivery-note"], query)}
                selectedOption={noteOption}
                placeholder="Search delivery notes"
                searchPlaceholder="Number or customer"
                emptyMessage="No delivery note matches."
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
              <ul className="text-sm space-y-1">
                {Object.entries(totalsByLineId).map(([lineId, kes]) => (
                  <li key={lineId} className="flex justify-between gap-4">
                    <span className="truncate">{named(lineNames, lineId, "Line")}</span>
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
                      <td className="py-2 pr-3">{named(tripNames, row.tripId, "Trip")}</td>
                      <td className="py-2 pr-3">{named(lineNames, row.lineId, "Line")}</td>
                      <td className="py-2 pr-3">{named(vehicleNames, row.vehicleId, "Vehicle")}</td>
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
