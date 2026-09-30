"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell, LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPickPackTasks, runPickPackAction, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { fetchDistributionVehicles, type DistributionVehicleRow } from "@/lib/api/logistics";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WarehouseDispatchPage() {
  const canWrite = useCanWriteInventory();
  const [rows, setRows] = React.useState<WarehousePickPackRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [vehicleMode, setVehicleMode] = React.useState<"LEASED" | "SPOT_HIRE">("LEASED");
  const [vehicles, setVehicles] = React.useState<DistributionVehicleRow[]>([]);
  const [vehicleId, setVehicleId] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [batchLabel, setBatchLabel] = React.useState("");
  const [trackingRef, setTrackingRef] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchPickPackTasks({ status: "PACKED" });
      setRows(items);
      setSelected(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load packed delivery notes.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    void fetchDistributionVehicles({ active: true })
      .then((items) => setVehicles(items.filter((v) => !v.type || String(v.type).toUpperCase() === "LEASED")))
      .catch(() => {
        /* Fleet list is optional until dispatch. */
      });
  }, [load]);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function dispatchSelected() {
    const ids = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
    if (!ids.length) {
      toast.error("Select at least one packed delivery note.");
      return;
    }
    if (!batchLabel.trim()) {
      toast.error("Enter a dispatch batch so these notes travel together.");
      return;
    }
    if (vehicleMode === "LEASED" && !vehicleId) {
      toast.error("Select a fleet vehicle.");
      return;
    }
    if (vehicleMode === "SPOT_HIRE" && !carrier.trim()) {
      toast.error("Enter the spot-hire carrier.");
      return;
    }
    setSaving(true);
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await runPickPackAction(id, {
          action: "dispatch",
          vehicleMode,
          vehicleId: vehicleMode === "LEASED" ? vehicleId : undefined,
          carrier: vehicleMode === "SPOT_HIRE" ? carrier.trim() : undefined,
          courier: vehicleMode === "SPOT_HIRE" ? carrier.trim() : undefined,
          batchLabel: batchLabel.trim(),
          trackingRef: trackingRef.trim() || undefined,
        });
      } catch (error) {
        const row = rows.find((item) => item.id === id);
        failed.push(row?.sourceDocumentNumber || row?.number || id);
        toast.error(error instanceof Error ? error.message : "Dispatch failed.");
      }
    }
    setSaving(false);
    if (!failed.length) {
      toast.success(`Dispatched ${ids.length} delivery note${ids.length === 1 ? "" : "s"} on ${batchLabel.trim()}.`);
    } else if (failed.length < ids.length) {
      toast.error(`Some notes stayed packed: ${failed.join(", ")}`);
    }
    await load();
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Dispatch"
        description="Send packed delivery notes from different customers on one vehicle and batch."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Dispatch" },
        ]}
        sticky
      />
      <div className={`${LIST_PAGE_BODY_CLASS} gap-4`}>
        <Card>
          <CardHeader>
            <CardTitle>Run</CardTitle>
            <CardDescription>
              Choose the notes below, then one vehicle and one batch name. The same batch joins them on one outbound trip.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVehicleMode("LEASED")}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium ${
                  vehicleMode === "LEASED"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                Fleet vehicle
              </button>
              <button
                type="button"
                onClick={() => setVehicleMode("SPOT_HIRE")}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium ${
                  vehicleMode === "SPOT_HIRE"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                Spot hire
              </button>
            </div>
            {vehicleMode === "LEASED" ? (
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger aria-label="Fleet vehicle">
                    <SelectValue placeholder={vehicles.length ? "Select vehicle…" : "No fleet vehicles found"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.code}
                        {vehicle.name ? ` — ${vehicle.name}` : ""}
                        {vehicle.registration ? ` (${vehicle.registration})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Carrier name</Label>
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier / driver name" />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dispatch batch</Label>
                <Input
                  value={batchLabel}
                  onChange={(e) => setBatchLabel(e.target.value)}
                  placeholder="e.g. Kitengela, Ruiru, Mathare"
                />
              </div>
              <div className="space-y-2">
                <Label>Waybill / courier tracking</Label>
                <Input
                  value={trackingRef}
                  onChange={(e) => setTrackingRef(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            {canWrite ? (
              <Button disabled={saving || selected.size === 0} onClick={() => void dispatchSelected()}>
                {saving ? "Dispatching…" : `Dispatch selected (${selected.size})`}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Packed delivery notes</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${rows.length} ready to leave the warehouse.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(value) => toggleAll(value === true)}
                      aria-label="Select all packed notes"
                      disabled={!rows.length}
                    />
                  </TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Cartons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={(value) => toggleOne(row.id, value === true)}
                        aria-label={`Select ${row.sourceDocumentNumber ?? row.number}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/warehouse/pick-pack/${row.id}`} className="font-medium underline-offset-2 hover:underline">
                        {row.sourceDocumentNumber ?? row.number}
                      </Link>
                    </TableCell>
                    <TableCell>{row.customer ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.lines.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.cartonsCount ?? 0}</TableCell>
                  </TableRow>
                ))}
                {!loading && !rows.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No packed delivery notes. Confirm pick and pack on an order first.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
