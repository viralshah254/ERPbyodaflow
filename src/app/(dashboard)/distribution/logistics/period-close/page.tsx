"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  closeLogisticsVehiclePeriod,
  fetchDistributionVehicles,
  fetchVehiclePeriodSummary,
  type VehiclePeriodSummary,
} from "@/lib/api/logistics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

function defaultPeriodKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function LogisticsVehiclePeriodClosePage() {
  const [vehicles, setVehicles] = React.useState<{ id: string; code: string; type?: string }[]>([]);
  const [vehicleId, setVehicleId] = React.useState("");
  const [periodKey, setPeriodKey] = React.useState(defaultPeriodKey());
  const [closing, setClosing] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{ varianceKes: number; postingBatchId?: string } | null>(null);
  const [periodSummary, setPeriodSummary] = React.useState<VehiclePeriodSummary | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchDistributionVehicles()
      .then((vs) => {
        if (!cancelled) setVehicles(vs.map((v) => ({ id: v.id, code: v.code, type: v.type })));
      })
      .catch(() => {
        if (!cancelled) setVehicles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!vehicleId || !/^\d{4}-\d{2}$/.test(periodKey.trim())) {
      setPeriodSummary(null);
      return;
    }
    let cancelled = false;
    fetchVehiclePeriodSummary(vehicleId, periodKey.trim())
      .then((s) => {
        if (!cancelled) setPeriodSummary(s);
      })
      .catch(() => {
        if (!cancelled) setPeriodSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, periodKey]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const needsInvoice = selectedVehicle?.type === "LEASED";
  const invoiceOk = !!periodSummary?.invoiceAttachmentId;

  const runClose = async () => {
    if (!vehicleId) {
      toast.error("Choose a vehicle.");
      return;
    }
    const pk = periodKey.trim();
    if (!/^\d{4}-\d{2}$/.test(pk)) {
      toast.error("Period must be YYYY-MM.");
      return;
    }
    if (needsInvoice && !invoiceOk) {
      toast.error("Upload the lease invoice on the Fleet page before closing.");
      return;
    }
    setClosing(true);
    setLastResult(null);
    try {
      const out = await closeLogisticsVehiclePeriod({
        vehicleId,
        periodKey: pk,
      });
      setLastResult({ varianceKes: out.varianceKes, postingBatchId: out.postingBatchId });
      toast.success("Vehicle logistics period closed.");
      const s = await fetchVehiclePeriodSummary(vehicleId, pk);
      setPeriodSummary(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Period close failed.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <PageLayout
      title="Logistics vehicle period close"
      description="Reconcile provisional outbound allocations vs actual lease + fuel for the month — posts variance journal and distributes row adjustments."
      breadcrumbs={[
        { label: "Distribution", href: "/distribution/trips" },
        { label: "Vehicle close" },
      ]}
    >
      <div className="space-y-6 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Close month per vehicle</CardTitle>
            <CardDescription>
              Leased vehicles require a monthly invoice upload before close. Lease is split equally across completed trips.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select
                value={vehicleId ? vehicleId : "__pick__"}
                onValueChange={(v) => setVehicleId(v === "__pick__" ? "" : v)}
              >
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
              <Label htmlFor="period">Calendar period</Label>
              <Input id="period" placeholder="YYYY-MM" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} />
            </div>

            {periodSummary && vehicleId && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{periodSummary.paymentStatus ?? "PENDING_INVOICE"}</Badge>
                  {periodSummary.status === "CLOSED" && <Badge variant="secondary">Closed</Badge>}
                </div>
                <p>Trips: {periodSummary.tripCount ?? 0}</p>
                {periodSummary.invoiceAmountKes != null && (
                  <p>Invoice: {formatMoney(periodSummary.invoiceAmountKes, "KES")}</p>
                )}
                {!invoiceOk && needsInvoice && (
                  <p className="text-destructive">Upload lease invoice on Fleet before closing.</p>
                )}
              </div>
            )}

            <Button
              type="button"
              onClick={() => void runClose()}
              disabled={closing || (needsInvoice && !invoiceOk) || periodSummary?.status === "CLOSED"}
            >
              {closing ? "Closing…" : "Close period"}
            </Button>
          </CardContent>
        </Card>

        {lastResult && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Variance: <span className="font-medium tabular-nums">{formatMoney(lastResult.varianceKes, "KES")}</span>
              </p>
              {lastResult.postingBatchId ? (
                <p className="font-mono text-xs break-all">
                  Journal batch id: {lastResult.postingBatchId}
                </p>
              ) : (
                <p className="text-muted-foreground">No journal created (rounding or zero variance).</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
