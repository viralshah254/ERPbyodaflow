"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFuelEvents, fetchDistributionVehicles, type FuelEventRow } from "@/lib/api/logistics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function LogisticsFuelAuditPage() {
  const [vehicles, setVehicles] = React.useState<{ id: string; code: string }[]>([]);
  const [vehicleId, setVehicleId] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [rows, setRows] = React.useState<FuelEventRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchDistributionVehicles()
      .then((vs) => {
        if (!cancelled) setVehicles(vs.map((v) => ({ id: v.id, code: v.code })));
      })
      .catch(() => {
        if (!cancelled) setVehicles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await fetchFuelEvents({
        vehicleId: vehicleId || undefined,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      });
      setRows(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load fuel events.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Fuel audit"
      description="Structured fuel captures with optional trip linkage (evidence attachments are visible in API / mobile)."
      breadcrumbs={[
        { label: "Distribution", href: "/distribution/trips" },
        { label: "Fuel audit" },
      ]}
    >
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Narrow by vehicle or date range — leave blank for the latest slice (server caps list size).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>Vehicle</Label>
              <Select value={vehicleId || "__all__"} onValueChange={(v) => setVehicleId(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All vehicles</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Recorded from</Label>
              <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Recorded to</Label>
              <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Button type="button" onClick={() => void reload()} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows. Adjust filters or create events from logistics mobile.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Recorded</th>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Trip</th>
                    <th className="py-2 pr-3 text-right">Odo km</th>
                    <th className="py-2 pr-3 text-right">L</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-muted/60">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(r.recordedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs max-w-[6rem] truncate">{r.vehicleId}</td>
                      <td className="py-2 pr-3 font-mono text-xs max-w-[6rem] truncate">{r.tripId ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.odometerKm ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.litres ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{formatMoney(r.amount ?? 0, r.currency ?? "KES")}</td>
                      <td className="py-2 text-muted-foreground max-w-xs truncate">{r.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
