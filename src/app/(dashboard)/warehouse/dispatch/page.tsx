"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageShell, LIST_PAGE_BODY_PAGINATED_CLASS, LIST_PAGE_SHELL_CLASS } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchPickPackPage, runPickPackAction, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { formatActivityExact, formatDocumentCreatedLabel } from "@/lib/format/nairobi-datetime";
import {
  createDistributionVehicle,
  fetchDispatchBatchPage,
  fetchDistributionVehicles,
  type DispatchBatchRow,
  type DistributionVehicleRow,
} from "@/lib/api/logistics";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

const NOTE_PAGE_SIZES = [20, 25, 30, 50];
const RUN_PAGE_SIZES = [10, 15, 20, 30];

function formatDispatchTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const time = date.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  const start = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const today = start(new Date());
  const day = start(date);
  if (day === today) return `Today, ${time}`;
  if (day === today - 86_400_000) return `Yesterday, ${time}`;
  const when = date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
  return `${when}, ${time}`;
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
  const [notesLoading, setNotesLoading] = React.useState(true);
  const [runsLoading, setRunsLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Map<string, WarehousePickPackRow>>(new Map());
  const [noteSearchInput, setNoteSearchInput] = React.useState("");
  const [noteSearch, setNoteSearch] = React.useState("");
  const [noteOffset, setNoteOffset] = React.useState(0);
  const [notePageSize, setNotePageSize] = React.useState(20);
  const [notePageSizes, setNotePageSizes] = React.useState<number[]>(NOTE_PAGE_SIZES);
  const [noteTotal, setNoteTotal] = React.useState(0);
  const [noteHasMore, setNoteHasMore] = React.useState(false);
  const [runSearchInput, setRunSearchInput] = React.useState("");
  const [runSearch, setRunSearch] = React.useState("");
  const [runDate, setRunDate] = React.useState("");
  const [runOffset, setRunOffset] = React.useState(0);
  const [runPageSize, setRunPageSize] = React.useState(10);
  const [runPageSizes, setRunPageSizes] = React.useState<number[]>(RUN_PAGE_SIZES);
  const [runTotal, setRunTotal] = React.useState(0);
  const [runHasMore, setRunHasMore] = React.useState(false);
  const [listVersion, setListVersion] = React.useState(0);
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

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = noteSearchInput.trim();
      setNoteSearch((current) => {
        if (current === next) return current;
        setNoteOffset(0);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [noteSearchInput]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = runSearchInput.trim();
      setRunSearch((current) => {
        if (current === next) return current;
        setRunOffset(0);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [runSearchInput]);

  React.useEffect(() => {
    let cancelled = false;
    setNotesLoading(true);
    void fetchPickPackPage({ status: "PACKED", search: noteSearch, limit: notePageSize, offset: noteOffset })
      .then((page) => {
        if (cancelled) return;
        setRows(page.items);
        setNoteTotal(page.totalCount);
        setNoteHasMore(page.hasMore);
        if (page.pageSizeOptions.length) setNotePageSizes(page.pageSizeOptions);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows([]);
        setNoteTotal(0);
        setNoteHasMore(false);
        toast.error(error instanceof Error ? error.message : "Failed to load packed delivery notes.");
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noteSearch, noteOffset, notePageSize, listVersion]);

  React.useEffect(() => {
    let cancelled = false;
    setRunsLoading(true);
    void fetchDispatchBatchPage({ search: runSearch, date: runDate, limit: runPageSize, offset: runOffset })
      .then((page) => {
        if (cancelled) return;
        setRuns(page.items);
        setRunTotal(page.totalCount);
        setRunHasMore(page.hasMore);
        if (page.pageSizeOptions.length) setRunPageSizes(page.pageSizeOptions);
      })
      .catch(() => {
        if (cancelled) return;
        setRuns([]);
        setRunTotal(0);
        setRunHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setRunsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runSearch, runDate, runOffset, runPageSize, listVersion]);

  React.useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const selectedRows = React.useMemo(() => [...selected.values()], [selected]);
  const fleetByCode = React.useMemo(() => {
    const byCode = new Map<string, DistributionVehicleRow>();
    for (const vehicle of vehicles) {
      if (vehicle.code) byCode.set(vehicle.code, vehicle);
    }
    return byCode;
  }, [vehicles]);
  const vehicleReady = vehicleMode === "LEASED" ? Boolean(vehicleId) : Boolean(carrier.trim());
  const chosenVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const row of rows) {
        if (checked) next.set(row.id, row);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function toggleOne(row: WarehousePickPackRow, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(row.id, row);
      else next.delete(row.id);
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
    const sentIds: string[] = [];
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
        sentIds.push(id);
      } catch (error) {
        const row = selected.get(id);
        failed.push(row?.sourceDocumentNumber || row?.number || id);
        toast.error(error instanceof Error ? error.message : "Dispatch failed.");
      }
    }
    setSaving(false);
    if (sentIds.length && !failed.length) {
      toast.success(`${sentIds.length} delivery note${sentIds.length === 1 ? "" : "s"} loaded. The phone can deliver them now.`);
    } else if (sentIds.length) {
      toast.error(`Some notes stayed packed: ${failed.join(", ")}`);
    }
    if (sentIds.length) {
      setSelected((prev) => {
        const next = new Map(prev);
        for (const id of sentIds) next.delete(id);
        return next;
      });
      setListVersion((version) => version + 1);
    }
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
      <div className={`${LIST_PAGE_BODY_PAGINATED_CLASS} gap-4 pb-16`}>
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
                <SearchableSelect
                  value={vehicleId}
                  onValueChange={setVehicleId}
                  options={vehicles.map((vehicle) => ({
                    id: vehicle.id,
                    label: [vehicle.name, vehicle.registration, vehicle.code].filter(Boolean).join(" · "),
                  }))}
                  placeholder={vehicles.length ? "Search name or number plate" : "No fleet vehicles yet"}
                  searchPlaceholder="Name or number plate"
                  emptyMessage="No vehicle matches that name or plate."
                  disabled={!vehicles.length}
                />
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
              {noteTotal > 0
                ? `${noteTotal} packed ${noteTotal === 1 ? "note is" : "notes are"} waiting for a vehicle.`
                : vehicleReady
                  ? "Tick every note this vehicle is taking. The total is what leaves the warehouse."
                  : "Nothing is packed and waiting. Pick and pack a delivery note, then it shows up here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="px-6 pt-4">
              <Input
                value={noteSearchInput}
                onChange={(event) => setNoteSearchInput(event.target.value)}
                placeholder="Search delivery note or customer"
                aria-label="Search packed delivery notes"
              />
            </div>
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
                  <TableHead>When</TableHead>
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
                        onCheckedChange={(value) => toggleOne(row, value === true)}
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
                    <TableCell className="whitespace-nowrap text-muted-foreground" title={formatActivityExact(row.createdAt) || undefined}>
                      {formatDocumentCreatedLabel(row.createdAt) || "—"}
                    </TableCell>
                    <TableCell>{row.customer ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{rowQty(row)}</TableCell>
                  </TableRow>
                ))}
                {!notesLoading && !rows.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {noteSearch ? (
                        "No packed notes match that search."
                      ) : (
                        <>
                          Nothing is packed yet.{" "}
                          <Link href="/warehouse/pick-pack" className="underline underline-offset-2">
                            Confirm pick and pack
                          </Link>{" "}
                          first.
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="px-4 pb-4">
              <TablePagination
                pageOffset={noteOffset}
                pageSize={notePageSize}
                itemCount={rows.length}
                hasMore={noteHasMore}
                totalCount={noteTotal}
                loading={notesLoading && rows.length === 0}
                busy={notesLoading && rows.length > 0}
                onPrevious={() => setNoteOffset((offset) => Math.max(0, offset - notePageSize))}
                onNext={() => setNoteOffset((offset) => offset + notePageSize)}
                onPageSizeChange={(size) => {
                  setNotePageSize(size);
                  setNoteOffset(0);
                }}
                pageSizeOptions={notePageSizes}
                entityLabel="delivery notes"
              />
            </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Already out</CardTitle>
            <CardDescription>These loads are on the road. The phone delivers them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="flex flex-col gap-2 px-6 pt-4 sm:flex-row">
              <Input
                value={runSearchInput}
                onChange={(event) => setRunSearchInput(event.target.value)}
                placeholder="Search vehicle"
                aria-label="Search loads by vehicle"
                className="sm:max-w-xs"
              />
              <Input
                type="date"
                value={runDate}
                onChange={(event) => {
                  setRunDate(event.target.value);
                  setRunOffset(0);
                }}
                aria-label="Dispatch date"
                className="sm:w-44"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Left</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Notes</TableHead>
                  <TableHead>Delivery notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const fleet = run.vehicleCode ? fleetByCode.get(run.vehicleCode) : undefined;
                  const vehicleName = run.vehicleName || fleet?.name;
                  const vehiclePlate = run.vehicleRegistration || fleet?.registration;
                  return (
                  <TableRow key={run.id}>
                    <TableCell className="whitespace-nowrap">{formatDispatchTime(run.plannedAt)}</TableCell>
                    <TableCell className="font-medium">{run.label}</TableCell>
                    <TableCell>
                      <div>{vehicleName || run.vehicleCode || "—"}</div>
                      {vehiclePlate ? (
                        <div className="text-xs text-muted-foreground">{vehiclePlate}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{run.stopCount}</TableCell>
                    <TableCell>
                      {run.deliveryNotes?.length ? (
                        run.deliveryNotes.map((note, index) => (
                          <span key={note.id}>
                            {index > 0 ? ", " : null}
                            <Link href={`/docs/delivery-note/${note.id}`} className="underline-offset-2 hover:underline">
                              {note.number}
                            </Link>
                          </span>
                        ))
                      ) : run.deliveryNoteNumbers.length ? (
                        run.deliveryNoteNumbers.join(", ")
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
                {!runsLoading && !runs.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {runSearch || runDate ? "No loads match that vehicle or date." : "Nothing is on the road."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="px-4 pb-4">
              <TablePagination
                pageOffset={runOffset}
                pageSize={runPageSize}
                itemCount={runs.length}
                hasMore={runHasMore}
                totalCount={runTotal}
                loading={runsLoading && runs.length === 0}
                busy={runsLoading && runs.length > 0}
                onPrevious={() => setRunOffset((offset) => Math.max(0, offset - runPageSize))}
                onNext={() => setRunOffset((offset) => offset + runPageSize)}
                onPageSizeChange={(size) => {
                  setRunPageSize(size);
                  setRunOffset(0);
                }}
                pageSizeOptions={runPageSizes}
                entityLabel="loads"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <SheetContent className="overflow-y-auto">
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
