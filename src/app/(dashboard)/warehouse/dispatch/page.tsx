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

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function lineLoad(line: WarehousePickPackRow["lines"][number]): { qty: number; unit: string } {
  if (typeof line.documentQuantity === "number" && line.documentQuantity > 0) {
    return { qty: line.documentQuantity, unit: (line.documentUnit || "PCS").toUpperCase() };
  }
  const qty = line.pickedQty && line.pickedQty > 0 ? line.pickedQty : line.quantity;
  return { qty, unit: (line.baseUom || line.documentUnit || "PCS").toUpperCase() };
}

function qtyByUnit(rows: WarehousePickPackRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const line of row.lines) {
      const { qty, unit } = lineLoad(line);
      if (qty > 0) totals.set(unit, (totals.get(unit) ?? 0) + qty);
    }
  }
  return totals;
}

function loadSummary(rows: WarehousePickPackRow[]): string {
  if (!rows.length) return "Nothing selected";
  const customers = new Set(rows.map((row) => row.customer).filter(Boolean));
  const cartons = rows.reduce((sum, row) => sum + (row.cartonsCount ?? 0), 0);
  const parts = [
    `${rows.length} note${rows.length === 1 ? "" : "s"}`,
    `${customers.size} customer${customers.size === 1 ? "" : "s"}`,
  ];
  if (cartons > 0) parts.push(`${formatQty(cartons)} carton${cartons === 1 ? "" : "s"}`);
  for (const [unit, qty] of qtyByUnit(rows)) {
    parts.push(`${formatQty(qty)} ${unit.toLowerCase()}`);
  }
  return parts.join(" · ");
}

function rowQty(row: WarehousePickPackRow): string {
  const totals = qtyByUnit([row]);
  if (!totals.size) return "—";
  return [...totals.entries()].map(([unit, qty]) => `${formatQty(qty)} ${unit.toLowerCase()}`).join(" · ");
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
  const [trackingRef, setTrackingRef] = React.useState("");
  const [showWaybill, setShowWaybill] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = React.useState(false);
  const [addVehicleSaving, setAddVehicleSaving] = React.useState(false);
  const [addVehicleForm, setAddVehicleForm] = React.useState({
    code: "",
    name: "",
    registration: "",
    monthlyCost: "",
  });

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

  const selectedRows = React.useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected]);
  const vehicleReady = vehicleMode === "LEASED" ? Boolean(vehicleId) : Boolean(carrier.trim());
  const chosenVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
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

  function tripName(): string {
    const routes = [...new Set(selectedRows.map((row) => row.batchLabel?.trim()).filter(Boolean))] as string[];
    if (routes.length === 1) return routes[0]!;
    const day = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short" });
    if (vehicleMode === "SPOT_HIRE") return `${carrier.trim()} ${day}`;
    const label = chosenVehicle?.registration || chosenVehicle?.code || "Fleet";
    return `${label} ${day}`;
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
      toast.success("Vehicle added. Now choose the delivery notes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add vehicle.");
    } finally {
      setAddVehicleSaving(false);
    }
  }

  async function dispatchSelected() {
    if (!vehicleReady) {
      toast.error("Choose the vehicle first.");
      return;
    }
    const ids = selectedRows.map((row) => row.id);
    if (!ids.length) {
      toast.error("Select the delivery notes going on this vehicle.");
      return;
    }
    const batch = tripName();
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
      toast.success(`${sent} delivery note${sent === 1 ? "" : "s"} loaded. The phone can deliver them now.`);
    } else if (sent > 0) {
      toast.error(`Some notes stayed packed: ${failed.join(", ")}`);
    }
    await load();
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Dispatch"
        description="Pick the vehicle, then the delivery notes going on it. The phone delivers the same notes."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Dispatch" },
        ]}
        sticky
      />
      <div className={`${LIST_PAGE_BODY_CLASS} gap-4`}>
        <Card>
          <CardHeader>
            <CardTitle>1. Vehicle</CardTitle>
            <CardDescription>One vehicle takes this load. Add one if the fleet list is empty.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  <SelectTrigger aria-label="Vehicle">
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
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setVehicleMode("SPOT_HIRE");
                    setVehicleId("");
                  }}
                >
                  Hired truck instead
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Carrier or driver</Label>
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Name of the hired truck" />
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setVehicleMode("LEASED")}
                >
                  Use a fleet vehicle
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={vehicleReady ? undefined : "opacity-60"}>
          <CardHeader>
            <CardTitle>2. Delivery notes</CardTitle>
            <CardDescription>
              {vehicleReady
                ? "Tick every note this vehicle is taking. The total is what leaves the warehouse."
                : "Choose a vehicle first. Packed notes appear here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(value) => toggleAll(value === true)}
                      aria-label="Select all packed notes"
                      disabled={!vehicleReady || !rows.length}
                    />
                  </TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Load</TableHead>
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
                        disabled={!vehicleReady}
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>{row.customer ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{rowQty(row)}</TableCell>
                  </TableRow>
                ))}
                {!loading && !rows.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Nothing is packed yet.{" "}
                      <Link href="/warehouse/pick-pack" className="underline underline-offset-2">
                        Confirm pick and pack
                      </Link>{" "}
                      first.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {vehicleReady ? (
              <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">{loadSummary(selectedRows)}</p>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {canWrite ? (
                    <Button disabled={saving || selected.size === 0} onClick={() => void dispatchSelected()}>
                      {saving ? "Sending…" : "Send on this vehicle"}
                    </Button>
                  ) : null}
                  {!showWaybill ? (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => setShowWaybill(true)}
                    >
                      Add a waybill number
                    </button>
                  ) : (
                    <Input
                      value={trackingRef}
                      onChange={(e) => setTrackingRef(e.target.value)}
                      placeholder="Waybill, optional"
                      className="h-8 w-56"
                      aria-label="Waybill"
                    />
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {runs.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Already out</CardTitle>
              <CardDescription>These loads are on the road. The phone delivers them.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Sheet open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add fleet vehicle</SheetTitle>
            <SheetDescription>It is selected as soon as you save it. Then choose the notes.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="dispatch-vehicle-code">Code</Label>
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
