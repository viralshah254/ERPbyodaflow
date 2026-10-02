"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageShell, LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPickPackTasks, runPickPackAction, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import {
  createDistributionVehicle,
  fetchDispatchBatches,
  fetchDistributionVehicles,
  type DispatchBatchRow,
  type DistributionVehicleRow,
} from "@/lib/api/logistics";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function suggestFleetCode(vehicles: DistributionVehicleRow[]): string {
  const existing = vehicles
    .map((vehicle) => {
      const match = vehicle.code?.match(/^LSE-(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `LSE-${String(next).padStart(3, "0")}`;
}

export default function WarehouseDispatchPage() {
  const canWrite = useCanWriteInventory();
  const [rows, setRows] = React.useState<WarehousePickPackRow[]>([]);
  const [runs, setRuns] = React.useState<DispatchBatchRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [vehicleMode, setVehicleMode] = React.useState<"LEASED" | "SPOT_HIRE">("LEASED");
  const [vehicles, setVehicles] = React.useState<DistributionVehicleRow[]>([]);
  const [vehicleId, setVehicleId] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [batchLabel, setBatchLabel] = React.useState("");
  const [trackingRef, setTrackingRef] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = React.useState(false);
  const [addVehicleSaving, setAddVehicleSaving] = React.useState(false);
  const [addVehicleForm, setAddVehicleForm] = React.useState({
    code: "",
    name: "",
    registration: "",
    monthlyCost: "",
  });
  const lastAutoBatch = React.useRef("");

  const loadVehicles = React.useCallback(async () => {
    try {
      const items = await fetchDistributionVehicles({ active: true });
      const fleet = items.filter((vehicle) => !vehicle.type || String(vehicle.type).toUpperCase() === "LEASED");
      setVehicles(fleet);
      return fleet;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load fleet vehicles.");
      return [] as DistributionVehicleRow[];
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [items, batches] = await Promise.all([
        fetchPickPackTasks({ status: "PACKED" }),
        fetchDispatchBatches().catch(() => [] as DispatchBatchRow[]),
      ]);
      setRows(items);
      setRuns(batches);
      setSelected(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load packed delivery notes.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    void loadVehicles();
  }, [load, loadVehicles]);

  const selectedRows = React.useMemo(
    () => rows.filter((row) => selected.has(row.id)),
    [rows, selected]
  );
  const sharedRoutes = React.useMemo(() => {
    const labels = selectedRows.map((row) => row.batchLabel?.trim()).filter((label): label is string => Boolean(label));
    return [...new Set(labels)];
  }, [selectedRows]);

  React.useEffect(() => {
    if (sharedRoutes.length !== 1) return;
    const route = sharedRoutes[0]!;
    setBatchLabel((current) => {
      if (!current || current === lastAutoBatch.current) {
        lastAutoBatch.current = route;
        return route;
      }
      return current;
    });
  }, [sharedRoutes]);

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

  function openAddVehicle() {
    setAddVehicleForm({
      code: suggestFleetCode(vehicles),
      name: "",
      registration: "",
      monthlyCost: "",
    });
    setAddVehicleOpen(true);
  }

  async function handleCreateVehicle() {
    const code = addVehicleForm.code.trim().toUpperCase();
    if (!code) {
      toast.error("Vehicle code is required.");
      return;
    }
    setAddVehicleSaving(true);
    try {
      const created = await createDistributionVehicle({
        code,
        name: addVehicleForm.name.trim() || undefined,
        type: "LEASED",
        registration: addVehicleForm.registration.trim() || undefined,
        monthlyCost: addVehicleForm.monthlyCost.trim() ? Number(addVehicleForm.monthlyCost) : undefined,
        assumedTripsPerMonth: 12,
        currency: "KES",
      });
      const fleet = await loadVehicles();
      const id = created?.id || fleet.find((vehicle) => vehicle.code?.toUpperCase() === code)?.id;
      if (id) setVehicleId(id);
      setVehicleMode("LEASED");
      setAddVehicleOpen(false);
      toast.success("Vehicle added to the fleet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add vehicle.");
    } finally {
      setAddVehicleSaving(false);
    }
  }

  async function dispatchSelected() {
    const ids = selectedRows.map((row) => row.id);
    if (!ids.length) {
      toast.error("Select at least one packed delivery note.");
      return;
    }
    const batch = batchLabel.trim();
    if (!batch) {
      toast.error("Enter a dispatch batch so these notes travel together.");
      return;
    }
    if (vehicleMode === "LEASED" && !vehicleId) {
      toast.error("Select a fleet vehicle, or add one.");
      return;
    }
    if (vehicleMode === "SPOT_HIRE" && !carrier.trim()) {
      toast.error("Enter the spot-hire carrier.");
      return;
    }
    setSaving(true);
    const failed: string[] = [];
    let sent = 0;
    for (const id of ids) {
      try {
        await runPickPackAction(id, {
          action: "dispatch",
          vehicleMode,
          vehicleId: vehicleMode === "LEASED" ? vehicleId : undefined,
          carrier: vehicleMode === "SPOT_HIRE" ? carrier.trim() : undefined,
          courier: vehicleMode === "SPOT_HIRE" ? carrier.trim() : undefined,
          batchLabel: batch,
          trackingRef: trackingRef.trim() || undefined,
        });
        sent += 1;
      } catch (error) {
        const row = rows.find((item) => item.id === id);
        failed.push(row?.sourceDocumentNumber || row?.number || id);
        toast.error(error instanceof Error ? error.message : "Dispatch failed.");
      }
    }
    setSaving(false);
    if (sent > 0 && !failed.length) {
      toast.success(
        `Dispatched ${sent} delivery note${sent === 1 ? "" : "s"} together on ${batch}.`
      );
    } else if (sent > 0) {
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
              Choose the packed notes below, then one vehicle and one batch name. Every selected note leaves on that same outbound trip.
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
                <div className="flex items-center justify-between gap-2">
                  <Label>Vehicle</Label>
                  {canWrite ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={openAddVehicle}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add vehicle
                    </Button>
                  ) : null}
                </div>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger aria-label="Fleet vehicle">
                    <SelectValue placeholder={vehicles.length ? "Select vehicle…" : "No fleet vehicles yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.code}
                        {vehicle.name ? ` — ${vehicle.name}` : ""}
                        {vehicle.registration ? ` (${vehicle.registration})` : ""}
                      </SelectItem>
                    ))}
                    {canWrite ? (
                      <div className="mt-1 border-t border-border pt-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={openAddVehicle}
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          Add vehicle…
                        </button>
                      </div>
                    ) : null}
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
                  onChange={(e) => {
                    lastAutoBatch.current = "";
                    setBatchLabel(e.target.value);
                  }}
                  placeholder="e.g. Kitengela, Ruiru, Mathare"
                />
                {sharedRoutes.length === 1 ? (
                  <p className="text-xs text-muted-foreground">
                    Selected notes share the route {sharedRoutes[0]}. That name is filled in so they leave together.
                  </p>
                ) : null}
                {sharedRoutes.length > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    These notes are on different routes ({sharedRoutes.join(", ")}). The batch name above still puts them on one vehicle.
                  </p>
                ) : null}
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
              {loading
                ? "Loading…"
                : `${rows.length} ready to leave the warehouse. Pick and pack must be confirmed before a note appears here.`}
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
                  <TableHead>Route</TableHead>
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
                      <div className="flex flex-col">
                        {row.sourceDocumentId ? (
                          <Link
                            href={`/docs/delivery-note/${row.sourceDocumentId}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {row.sourceDocumentNumber ?? row.number}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.sourceDocumentNumber ?? row.number}</span>
                        )}
                        <Link
                          href={`/warehouse/pick-pack/${row.id}`}
                          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                          {row.number}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>{row.customer ?? "—"}</TableCell>
                    <TableCell>{row.batchLabel?.trim() || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.lines.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.cartonsCount ?? 0}</TableCell>
                  </TableRow>
                ))}
                {!loading && !rows.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No packed delivery notes.{" "}
                      <Link href="/warehouse/pick-pack" className="underline underline-offset-2">
                        Confirm pick and pack
                      </Link>{" "}
                      on an order first, then select the notes here and send them on one vehicle.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open runs</CardTitle>
            <CardDescription>
              Trips already on the road. Each run holds every delivery note dispatched under that batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Notes</TableHead>
                  <TableHead>Delivery notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.label}</TableCell>
                    <TableCell>{run.vehicleCode || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.stopCount}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {run.deliveryNoteNumbers.length ? run.deliveryNoteNumbers.join(", ") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !runs.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No open runs yet. Dispatched notes will collect here under one batch.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add fleet vehicle</SheetTitle>
            <SheetDescription>
              Register a leased vehicle. It is selected for this dispatch as soon as you save it.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="dispatch-vehicle-code">Code</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setAddVehicleForm((form) => ({ ...form, code: suggestFleetCode(vehicles) }))}
                >
                  Use suggested
                </button>
              </div>
              <Input
                id="dispatch-vehicle-code"
                value={addVehicleForm.code}
                onChange={(e) => setAddVehicleForm((form) => ({ ...form, code: e.target.value.toUpperCase() }))}
                placeholder="Your fleet code"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch-vehicle-name">Name</Label>
              <Input
                id="dispatch-vehicle-name"
                value={addVehicleForm.name}
                onChange={(e) => setAddVehicleForm((form) => ({ ...form, name: e.target.value }))}
                placeholder="e.g. Isuzu NQR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch-vehicle-reg">Registration plate</Label>
              <Input
                id="dispatch-vehicle-reg"
                value={addVehicleForm.registration}
                onChange={(e) => setAddVehicleForm((form) => ({ ...form, registration: e.target.value }))}
                placeholder="e.g. KDA 123A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch-vehicle-cost">Monthly cost (optional)</Label>
              <Input
                id="dispatch-vehicle-cost"
                type="number"
                min={0}
                value={addVehicleForm.monthlyCost}
                onChange={(e) => setAddVehicleForm((form) => ({ ...form, monthlyCost: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setAddVehicleOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={addVehicleSaving || !addVehicleForm.code.trim()}
              onClick={() => void handleCreateVehicle()}
            >
              {addVehicleSaving ? "Saving…" : "Save vehicle"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
