"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { DataTable } from "@/components/ui/data-table";
import {
  fetchTrips,
  createTrip,
  fetchNextTripReference,
  fetchOpenDeliveryNotes,
  type TripRow,
  type TripType,
  type TripStatus,
  type OpenDeliveryNoteRow,
} from "@/lib/api/trips";
import { fetchDistributionVehicles, type DistributionVehicleRow } from "@/lib/api/logistics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Shared NewTripSheet component ────────────────────────────────────────────

export interface NewTripSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-set type (e.g. OUTBOUND when opened from a subcontract order). */
  defaultType?: TripType;
  /** Called after a trip is successfully created. */
  onCreated?: (tripId: string, tripReference: string) => void;
}

export function NewTripSheet({ open, onOpenChange, defaultType, onCreated }: NewTripSheetProps) {
  const [reference, setReference] = React.useState("");
  const [type, setType] = React.useState<TripType>(defaultType ?? "OUTBOUND");
  const [vehicleMode, setVehicleMode] = React.useState<"LEASED" | "SPOT_HIRE">("LEASED");
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");
  const [carrier, setCarrier] = React.useState("");
  const [plannedAt, setPlannedAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Fleet vehicles
  const [vehicles, setVehicles] = React.useState<DistributionVehicleRow[]>([]);
  // Open delivery notes (outbound only)
  const [openDns, setOpenDns] = React.useState<OpenDeliveryNoteRow[]>([]);
  const [selectedDnIds, setSelectedDnIds] = React.useState<Set<string>>(new Set());
  const [loadingDns, setLoadingDns] = React.useState(false);
  const [loadingRef, setLoadingRef] = React.useState(false);

  // Load data when sheet opens
  React.useEffect(() => {
    if (!open) return;
    setType(defaultType ?? "OUTBOUND");
    setVehicleMode("LEASED");
    setSelectedVehicleId("");
    setCarrier("");
    setSelectedDnIds(new Set());
    setPlannedAt(new Date().toISOString().slice(0, 16));

    // Auto-fetch reference
    setLoadingRef(true);
    fetchNextTripReference()
      .then((ref) => setReference(ref))
      .catch(() => setReference(""))
      .finally(() => setLoadingRef(false));

    // Fetch fleet vehicles
    fetchDistributionVehicles({ active: true })
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, [open, defaultType]);

  // Load delivery notes when type changes to OUTBOUND
  React.useEffect(() => {
    if (!open || type !== "OUTBOUND") return;
    setLoadingDns(true);
    fetchOpenDeliveryNotes()
      .then(setOpenDns)
      .catch(() => setOpenDns([]))
      .finally(() => setLoadingDns(false));
  }, [open, type]);

  const toggleDn = (id: string) => {
    setSelectedDnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const at = plannedAt || new Date().toISOString().slice(0, 16);
    if (vehicleMode === "LEASED" && !selectedVehicleId) {
      toast.error("Select a fleet vehicle, or switch to Spot hire.");
      return;
    }
    setSaving(true);
    try {
      const result = await createTrip({
        type,
        vehicleMode,
        vehicleId: vehicleMode === "LEASED" ? selectedVehicleId : undefined,
        carrier: vehicleMode === "SPOT_HIRE" ? carrier.trim() || undefined : undefined,
        reference: reference.trim() || undefined,
        plannedAt: new Date(at).toISOString(),
        deliveryNoteIds: type === "OUTBOUND" && selectedDnIds.size > 0 ? [...selectedDnIds] : undefined,
      });
      toast.success(`Trip ${result.reference} created.`);
      onOpenChange(false);
      onCreated?.(result.id, result.reference);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>New trip</SheetTitle>
          <SheetDescription>
            Inbound (farm → hub) or outbound (hub → customer). Fleet vehicle or spot hire.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 mt-6 space-y-5">
          {/* Reference */}
          <div className="space-y-2">
            <Label>Reference</Label>
            <div className="relative">
              <Input
                placeholder={loadingRef ? "Generating…" : "e.g. TRIP0001"}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={loadingRef}
              />
              {loadingRef && (
                <Icons.Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Auto-generated — you can edit it.</p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Trip type</Label>
            <div className="flex gap-2">
              {(["OUTBOUND", "INBOUND"] as TripType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    type === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {t === "OUTBOUND" ? "Outbound (hub → customer)" : "Inbound (farm → hub)"}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle */}
          <div className="space-y-3">
            <Label>Vehicle</Label>
            <div className="flex gap-2">
              {(["LEASED", "SPOT_HIRE"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVehicleMode(m)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    vehicleMode === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {m === "LEASED" ? "Fleet vehicle" : "Spot hire"}
                </button>
              ))}
            </div>

            {vehicleMode === "LEASED" ? (
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger aria-label="Fleet vehicle">
                  <SelectValue placeholder={vehicles.length ? "Select vehicle…" : "No fleet vehicles found"} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.code}
                      {v.name ? ` — ${v.name}` : ""}
                      {v.registration ? ` (${v.registration})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Carrier / driver name (optional)"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            )}
          </div>

          {/* Planned date */}
          <div className="space-y-2">
            <Label>Planned date & time</Label>
            <Input
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
            />
          </div>

          {/* Delivery notes (outbound only) */}
          {type === "OUTBOUND" && (
            <div className="space-y-2">
              <Label>Customer orders on this trip</Label>
              <p className="text-xs text-muted-foreground">
                Select which delivery notes this vehicle will fulfil. Transport cost will be allocated across them.
              </p>
              {loadingDns ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  Loading delivery notes…
                </div>
              ) : openDns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">
                  No open delivery notes found (approved or in transit). You can link them later from the trip detail.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border p-2">
                  {openDns.map((dn) => {
                    const checked = selectedDnIds.has(dn.id);
                    return (
                      <button
                        key={dn.id}
                        type="button"
                        onClick={() => toggleDn(dn.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded px-2 py-1.5 text-left text-sm transition-colors",
                          checked
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          )}
                        >
                          {checked && <Icons.Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="font-medium">{dn.number}</span>
                          {dn.customer && (
                            <span className="ml-2 text-xs opacity-70 truncate">{dn.customer}</span>
                          )}
                        </span>
                        {dn.total != null && (
                          <span className="text-xs tabular-nums shrink-0">
                            {formatMoney(dn.total, dn.currency ?? "KES")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedDnIds.size > 0 && (
                <p className="text-xs text-primary font-medium">
                  {selectedDnIds.size} order{selectedDnIds.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? (
              <>
                <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create trip"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Trips list page ───────────────────────────────────────────────────────────

export default function DistributionTripsPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [trips, setTrips] = React.useState<TripRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newTripOpen, setNewTripOpen] = React.useState(false);

  const reload = React.useCallback(() => {
    setLoading(true);
    fetchTrips({
      type: typeFilter as TripType | undefined,
      status: statusFilter as TripStatus | undefined,
    })
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter]);

  React.useEffect(() => { reload(); }, [reload]);

  const columns = React.useMemo(
    () => [
      {
        id: "reference",
        header: "Reference",
        accessor: (r: TripRow) => <span className="font-medium">{r.reference}</span>,
        sticky: true,
      },
      {
        id: "type",
        header: "Type",
        accessor: (r: TripRow) => <Badge variant="outline">{r.type}</Badge> as React.ReactNode,
      },
      {
        id: "vehicle",
        header: "Vehicle",
        accessor: (r: TripRow) =>
          r.vehicleMode === "LEASED"
            ? `Fleet — ${r.vehicleCode ?? "—"}`
            : r.carrier
              ? `Spot hire — ${r.carrier}`
              : "Spot hire" as React.ReactNode,
      },
      {
        id: "orders",
        header: "Orders",
        accessor: (r: TripRow) =>
          (r.deliveryNoteIds?.length ?? 0) > 0
            ? <span className="tabular-nums text-xs">{r.deliveryNoteIds!.length} DN{r.deliveryNoteIds!.length !== 1 ? "s" : ""}</span>
            : <span className="text-muted-foreground text-xs">—</span> as React.ReactNode,
      },
      {
        id: "plannedAt",
        header: "Planned",
        accessor: (r: TripRow) => new Date(r.plannedAt).toLocaleDateString() as React.ReactNode,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: TripRow) => (
          <Badge variant={r.status === "COMPLETED" ? "default" : "secondary"}>
            {r.status.replace("_", " ")}
          </Badge>
        ) as React.ReactNode,
      },
      {
        id: "totalCost",
        header: "Total cost",
        accessor: (r: TripRow) =>
          (r.totalCost != null ? formatMoney(r.totalCost, r.currency) : "—") as React.ReactNode,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Trips / Logistics"
        description="Leased vs spot truck; trip-level cost allocation (inbound / outbound)"
        breadcrumbs={[
          { label: "Distribution", href: "/distribution/routes" },
          { label: "Trips" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => setNewTripOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New trip
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Trips</CardTitle>
            <CardDescription>
              Farm → hub (inbound), hub → customer (outbound). Fleet vehicle or spot hire. Select delivery
              notes at creation to allocate transport cost to each order.
            </CardDescription>
            <div className="flex gap-2 mt-2">
              <Select value={typeFilter || "ALL"} onValueChange={(v) => setTypeFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading trips…</div>
            ) : (
              <DataTable
                data={trips}
                columns={columns}
                onRowClick={(row) => router.push(`/distribution/trips/${row.id}`)}
                emptyMessage="No trips yet. Create one with New trip."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <NewTripSheet
        open={newTripOpen}
        onOpenChange={setNewTripOpen}
        onCreated={() => reload()}
      />
    </PageShell>
  );
}
