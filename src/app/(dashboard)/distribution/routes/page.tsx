"use client";

import * as React from "react";
import {
  LIST_PAGE_SHELL_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createDistributionRoute, fetchDistributionRoutes, type DistributionRouteRow } from "@/lib/api/distribution";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import { useCanWriteDistribution } from "@/lib/rbac/use-write-guard";
import * as Icons from "lucide-react";

export default function DistributionRoutesPage() {
  const terminology = useTerminology();
  const canWrite = useCanWriteDistribution();
  const routeLabel = t("route", terminology);
  const [rows, setRows] = React.useState<DistributionRouteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [stops, setStops] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDistributionRoutes();
      setRows(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load routes.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const weekdayLabel = (weekday?: number) =>
    weekday == null ? "Any day" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday] ?? "Any day";

  const grouped = React.useMemo(() => {
    const map = new Map<string, DistributionRouteRow[]>();
    for (const row of rows) {
      const key = row.corridor?.trim() || "Other";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const columns = [
    { id: "name", header: "Name", accessor: (r: DistributionRouteRow) => <span className="font-medium">{r.name}</span>, sticky: true },
    { id: "kind", header: "Kind", accessor: (r: DistributionRouteRow) => r.kind ?? "SALES" },
    { id: "weekday", header: "Day", accessor: (r: DistributionRouteRow) => weekdayLabel(r.weekday) },
    { id: "schedule", header: "Description", accessor: (r: DistributionRouteRow) => r.description || "—" },
    { id: "fulfilment", header: "Fulfilment", accessor: (r: DistributionRouteRow) => r.fulfilmentWarehouseName ?? "—" },
    { id: "outlets", header: "Stops", accessor: (r: DistributionRouteRow) => r.stops?.length ?? 0 },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={`${routeLabel}s`}
        description="Route list and schedule"
        sticky
        showCommandHint
        actions={
          canWrite && <Button onClick={() => setSheetOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New route
          </Button>
        }
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 sm:p-6">
        {loading && !rows.length ? (
          <p className="text-sm text-muted-foreground">Loading routes...</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">No routes.</p>
        ) : (
          grouped.map(([corridor, items]) => (
            <div key={corridor} className="rounded-xl border bg-card shadow-sm">
              <div className="shrink-0 border-b px-4 py-3">
                <h3 className="text-sm font-semibold">{corridor}</h3>
                <p className="text-xs text-muted-foreground">{items.length} route{items.length === 1 ? "" : "s"}</p>
              </div>
              <DataTable
                data={items}
                columns={columns}
                emptyMessage="No routes."
                scrollMode="natural"
                size="comfortable"
                className="border-0"
              />
            </div>
          ))
        )}
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New route</SheetTitle>
            <SheetDescription>Create a live distributor route with named stops.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stops</Label>
              <Input value={stops} onChange={(e) => setStops(e.target.value)} placeholder="One stop, Two stop, Three stop" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  await createDistributionRoute({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    stops: stops.split(",").map((item) => item.trim()).filter(Boolean),
                  });
                  toast.success("Route created.");
                  setSheetOpen(false);
                  setName("");
                  setDescription("");
                  setStops("");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create route.");
                }
              }}
            >
              Save route
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
