"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { fetchTrips, type TripRow, type TripType, type TripStatus } from "@/lib/api/trips";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";
import { NewTripSheet } from "./new-trip-sheet";

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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
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
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Trips</h3>
            <p className="text-xs text-muted-foreground">
              Farm → hub (inbound), hub → customer (outbound). Fleet vehicle or spot hire. Select delivery
              notes at creation to allocate transport cost to each order.
            </p>
            <div className="mt-2 flex gap-2">
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
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading trips…</div>
          ) : (
            <DataTable
              data={trips}
              columns={columns}
              onRowClick={(row) => router.push(`/distribution/trips/${row.id}`)}
              emptyMessage="No trips yet. Create one with New trip."
              scrollMode="fill"
              size="comfortable"
              className="min-h-0 flex-1 border-0"
            />
          )}
        </div>
      </div>

      <NewTripSheet
        open={newTripOpen}
        onOpenChange={setNewTripOpen}
        onCreated={() => reload()}
      />
    </PageShell>
  );
}
