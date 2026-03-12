"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchTripById, addTripCost } from "@/lib/api/trips";
import type { TripRow } from "@/lib/api/trips";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COST_TYPE_LABELS: Record<string, string> = {
  FUEL: "Fuel",
  DRIVER: "Driver",
  HIRE_FEE: "Hire fee",
  TOLL: "Toll",
  OTHER: "Other",
};

const COST_TYPES = ["FUEL", "DRIVER", "HIRE_FEE", "TOLL", "OTHER"] as const;

export default function TripDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [trip, setTrip] = React.useState<TripRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [addCostOpen, setAddCostOpen] = React.useState(false);
  const [costType, setCostType] = React.useState<(typeof COST_TYPES)[number]>("FUEL");
  const [costAmount, setCostAmount] = React.useState("");
  const [costReference, setCostReference] = React.useState("");
  const [costSaving, setCostSaving] = React.useState(false);

  const loadTrip = React.useCallback(() => {
    setLoading(true);
    fetchTripById(id).then((t) => { setTrip(t ?? null); setLoading(false); });
  }, [id]);

  React.useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  if (loading && !trip) {
    return (
      <PageShell>
        <PageHeader title="Trip" breadcrumbs={[{ label: "Distribution", href: "/distribution/routes" }, { label: "Trips", href: "/distribution/trips" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }
  if (trip === null) {
    return (
      <PageShell>
        <PageHeader title="Trip not found" breadcrumbs={[{ label: "Distribution", href: "/distribution/routes" }, { label: "Trips", href: "/distribution/trips" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Trip not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/distribution/trips">Back to trips</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const handleAddCost = async () => {
    const amount = Number(costAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setCostSaving(true);
    try {
      await addTripCost(id, {
        costType,
        amount,
        currency: trip.currency,
        reference: costReference.trim() || undefined,
      });
      toast.success("Cost line added.");
      setAddCostOpen(false);
      setCostAmount("");
      setCostReference("");
      loadTrip();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add cost.");
    } finally {
      setCostSaving(false);
    }
  };

  const costLines = trip.costLines ?? [];

  return (
    <PageShell>
      <PageHeader
        title={trip.reference}
        description={`${trip.type} · ${trip.vehicleMode === "LEASED" ? `Leased ${trip.vehicleCode ?? ""}` : "Spot hire"}`}
        breadcrumbs={[
          { label: "Distribution", href: "/distribution/routes" },
          { label: "Trips", href: "/distribution/trips" },
          { label: trip.reference },
        ]}
        sticky
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddCostOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add cost
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/distribution/trips">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Summary</CardTitle>
                <CardDescription>Leased vs spot hire movement with cost traceability.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-medium">{trip.reference}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <Badge variant="outline">{trip.type}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{trip.vehicleMode === "LEASED" ? `Leased ${trip.vehicleCode ?? ""}` : "Spot hire"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={trip.status === "COMPLETED" ? "default" : "secondary"}>{trip.status.replace("_", " ")}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Planned</p>
                  <p className="font-medium">{new Date(trip.plannedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-medium">{trip.completedAt ? new Date(trip.completedAt).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total cost</p>
                  <p className="font-medium">{trip.totalCost != null ? formatMoney(trip.totalCost, trip.currency) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ownership / Lane</p>
                  <OwnershipLocationBadge owner="CoolCatch" location={trip.type === "INBOUND" ? "Inbound to hub" : "Outbound dispatch"} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost lines</CardTitle>
                <CardDescription>Fuel, driver, hire fee, toll allocated to this trip.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          No cost lines. Add fuel, driver, or hire fee.
                        </TableCell>
                      </TableRow>
                    ) : (
                      costLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{COST_TYPE_LABELS[line.costType] ?? line.costType}</TableCell>
                          <TableCell>{formatMoney(line.amount, line.currency)}</TableCell>
                          <TableCell className="text-muted-foreground">{line.reference ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <CostImpactPanel
              title="Trip Cost Summary"
              currency={trip.currency}
              lines={costLines.map((line) => ({
                label: COST_TYPE_LABELS[line.costType] ?? line.costType,
                amount: line.amount,
              }))}
            />
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Trip Timeline"
              steps={[
                { id: "planned", label: "Trip planned", status: "completed", timestamp: trip.plannedAt },
                { id: "dispatch", label: "Vehicle assigned / dispatched", status: trip.status === "PLANNED" ? "current" : "completed" },
                { id: "transit", label: "In transit", status: trip.status === "IN_TRANSIT" ? "current" : trip.status === "COMPLETED" ? "completed" : "upcoming" },
                { id: "complete", label: "Trip completed", status: trip.status === "COMPLETED" ? "completed" : "upcoming", timestamp: trip.completedAt },
              ]}
            />
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={[
                    { id: "1", action: "Trip created", user: "Logistics Coordinator", timestamp: new Date(trip.plannedAt).toLocaleString(), detail: trip.reference },
                    { id: "2", action: "Cost lines tracked", user: "Finance", timestamp: new Date().toLocaleString(), detail: `${costLines.length} line(s)` },
                  ]}
                  comments={[
                    { id: "c1", user: "Dispatch", text: "Compare leased and spot-hire economics before next lane planning run.", timestamp: new Date().toLocaleString() },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Sheet open={addCostOpen} onOpenChange={setAddCostOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add cost line</SheetTitle>
            <SheetDescription>Fuel, driver, hire fee, toll — allocated to this trip.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={costType} onValueChange={(v) => setCostType(v as (typeof COST_TYPES)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{COST_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ({trip.currency})</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                value={costReference}
                onChange={(e) => setCostReference(e.target.value)}
                placeholder="e.g. Spot hire ref"
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddCostOpen(false)} disabled={costSaving}>Cancel</Button>
            <Button onClick={handleAddCost} disabled={costSaving}>{costSaving ? "Saving…" : "Add cost"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
