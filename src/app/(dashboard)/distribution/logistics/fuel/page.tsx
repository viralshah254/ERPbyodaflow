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
import {
  createFuelEvent,
  fetchFuelEvents,
  fetchDistributionVehicles,
  type FuelEventRow,
} from "@/lib/api/logistics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function LogisticsFuelAuditPage() {
  const [vehicles, setVehicles] = React.useState<{ id: string; code: string }[]>([]);
  const [vehicleId, setVehicleId] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [rows, setRows] = React.useState<FuelEventRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [formVehicleId, setFormVehicleId] = React.useState("");
  const [formTripId, setFormTripId] = React.useState("");
  const [formOdo, setFormOdo] = React.useState("");
  const [formLitres, setFormLitres] = React.useState("");
  const [formAmount, setFormAmount] = React.useState("");
  const [formNote, setFormNote] = React.useState("");
  const [formFile, setFormFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchDistributionVehicles()
      .then((vs) => {
        if (!cancelled) {
          const mapped = vs.map((v) => ({ id: v.id, code: v.code }));
          setVehicles(mapped);
          if (mapped.length === 1) {
            setFormVehicleId(mapped[0]!.id);
          }
        }
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

  React.useEffect(() => {
    void reload();
  }, []);

  const submitFuel = async () => {
    if (!formVehicleId) {
      toast.error("Choose a vehicle.");
      return;
    }
    const odo = parseFloat(formOdo);
    const amount = parseFloat(formAmount);
    if (!Number.isFinite(odo) || odo < 0) {
      toast.error("Enter a valid odometer reading.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid fuel amount.");
      return;
    }
    const litres = formLitres.trim() ? parseFloat(formLitres) : undefined;
    setSaving(true);
    try {
      await createFuelEvent({
        vehicleId: formVehicleId,
        tripId: formTripId.trim() || undefined,
        odometerKm: odo,
        litres: litres != null && Number.isFinite(litres) ? litres : undefined,
        amount,
        note: formNote.trim() || undefined,
        file: formFile ?? undefined,
      });
      toast.success("Fuel event saved.");
      setFormOdo("");
      setFormLitres("");
      setFormAmount("");
      setFormNote("");
      setFormTripId("");
      setFormFile(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save fuel event.");
    } finally {
      setSaving(false);
    }
  };

  const tripLabel = (r: FuelEventRow) =>
    r.tripBatchLabel || r.tripReference || (r.tripId ? r.tripId.slice(0, 8) : "—");

  return (
    <PageLayout
      title="Fuel audit"
      description="Capture fuel costs with optional trip linkage and receipt evidence."
      breadcrumbs={[
        { label: "Distribution", href: "/distribution/trips" },
        { label: "Fuel audit" },
      ]}
    >
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Log fuel purchase</CardTitle>
            <CardDescription>Add fuel from the web — same data as the dispatch mobile fuel screen.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Vehicle</Label>
              <Select value={formVehicleId || "__pick__"} onValueChange={(v) => setFormVehicleId(v === "__pick__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__">Choose vehicle…</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trip id (optional)</Label>
              <Input value={formTripId} onChange={(e) => setFormTripId(e.target.value)} placeholder="Link to outbound trip" />
            </div>
            <div className="space-y-2">
              <Label>Odometer (km)</Label>
              <Input type="number" min={0} value={formOdo} onChange={(e) => setFormOdo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Litres (optional)</Label>
              <Input type="number" min={0} value={formLitres} onChange={(e) => setFormLitres(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input type="number" min={0} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Receipt (optional)</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFormFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label>Note</Label>
              <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Station, batch, etc." />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="button" onClick={() => void submitFuel()} disabled={saving}>
                {saving ? "Saving…" : "Save fuel event"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Narrow by vehicle or date range.</CardDescription>
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
              <p className="text-sm text-muted-foreground">No rows yet. Log fuel above or from dispatch mobile.</p>
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
                      <td className="py-2 pr-3">{r.vehicleCode ?? r.vehicleId}</td>
                      <td className="py-2 pr-3">{tripLabel(r)}</td>
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
