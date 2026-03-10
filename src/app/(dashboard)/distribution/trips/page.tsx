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
import { fetchTrips, createTrip, type TripRow, type TripType, type TripStatus } from "@/lib/api/trips";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DistributionTripsPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [trips, setTrips] = React.useState<TripRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newTripOpen, setNewTripOpen] = React.useState(false);
  const [newTripReference, setNewTripReference] = React.useState("");
  const [newTripType, setNewTripType] = React.useState<TripType>("INBOUND");
  const [newTripVehicleMode, setNewTripVehicleMode] = React.useState<"LEASED" | "SPOT_HIRE">("SPOT_HIRE");
  const [newTripPlannedAt, setNewTripPlannedAt] = React.useState("");
  const [newTripSaving, setNewTripSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTrips({
      type: typeFilter as TripType | undefined,
      status: statusFilter as TripStatus | undefined,
    })
      .then((data) => { if (!cancelled) setTrips(data); })
      .catch(() => { if (!cancelled) setTrips([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [typeFilter, statusFilter]);

  const handleCreateTrip = async () => {
    const plannedAt = newTripPlannedAt || new Date().toISOString().slice(0, 16);
    setNewTripSaving(true);
    try {
      await createTrip({
        type: newTripType,
        vehicleMode: newTripVehicleMode,
        reference: newTripReference.trim() || undefined,
        plannedAt: new Date(plannedAt).toISOString(),
      });
      toast.success("Trip created.");
      setNewTripOpen(false);
      setNewTripReference("");
      setNewTripType("INBOUND");
      setNewTripVehicleMode("SPOT_HIRE");
      setNewTripPlannedAt("");
      fetchTrips({ type: typeFilter as TripType | undefined, status: statusFilter as TripStatus | undefined }).then(setTrips);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create trip.");
    } finally {
      setNewTripSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "reference",
        header: "Reference",
        accessor: (r: TripRow) => <span className="font-medium">{r.reference}</span>,
        sticky: true,
      },
      { id: "type", header: "Type", accessor: (r: TripRow) => <Badge variant="outline">{r.type}</Badge> as React.ReactNode },
      { id: "vehicleMode", header: "Vehicle", accessor: (r: TripRow) => r.vehicleMode === "LEASED" ? `Leased ${r.vehicleCode ?? ""}` : "Spot hire" as React.ReactNode },
      { id: "plannedAt", header: "Planned", accessor: (r: TripRow) => new Date(r.plannedAt).toLocaleDateString() as React.ReactNode },
      { id: "status", header: "Status", accessor: (r: TripRow) => <Badge variant={r.status === "COMPLETED" ? "default" : "secondary"}>{r.status.replace("_", " ")}</Badge> as React.ReactNode },
      { id: "totalCost", header: "Total cost", accessor: (r: TripRow) => (r.totalCost != null ? formatMoney(r.totalCost, r.currency) : "—") as React.ReactNode },
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
          <Button onClick={() => { setNewTripPlannedAt(new Date().toISOString().slice(0, 16)); setNewTripOpen(true); }}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New trip
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Trips</CardTitle>
            <CardDescription>Farm → hub (inbound), hub → franchisee (outbound). Monthly leased truck or spot-hire per trip.</CardDescription>
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
                emptyMessage="No trips. Create one with New trip."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={newTripOpen} onOpenChange={setNewTripOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New trip</SheetTitle>
            <SheetDescription>Inbound (farm → hub) or outbound (hub → franchisee). Leased truck or spot hire.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="e.g. TRIP-2025-004"
                value={newTripReference}
                onChange={(e) => setNewTripReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newTripType} onValueChange={(v) => setNewTripType(v as TripType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={newTripVehicleMode} onValueChange={(v) => setNewTripVehicleMode(v as "LEASED" | "SPOT_HIRE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEASED">Leased truck</SelectItem>
                  <SelectItem value="SPOT_HIRE">Spot hire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Planned date & time</Label>
              <Input
                type="datetime-local"
                value={newTripPlannedAt}
                onChange={(e) => setNewTripPlannedAt(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setNewTripOpen(false)} disabled={newTripSaving}>Cancel</Button>
            <Button onClick={handleCreateTrip} disabled={newTripSaving}>{newTripSaving ? "Creating…" : "Create trip"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
