"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  fetchDistributionVehicles,
  createDistributionVehicle,
  updateDistributionVehicle,
  deleteDistributionVehicle,
  type DistributionVehicleRow,
} from "@/lib/api/logistics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { Truck, Plus, Pencil, Trash2 } from "lucide-react";

type VehicleForm = {
  code: string;
  name: string;
  type: "LEASED" | "SPOT";
  registration: string;
  monthlyCost: string;
  assumedTripsPerMonth: string;
  currency: string;
};

const emptyForm = (): VehicleForm => ({
  code: "",
  name: "",
  type: "SPOT",
  registration: "",
  monthlyCost: "",
  assumedTripsPerMonth: "12",
  currency: "KES",
});

export default function FleetPage() {
  const [vehicles, setVehicles] = React.useState<(DistributionVehicleRow & { isActive?: boolean })[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<VehicleForm>(emptyForm());
  const [saving, setSaving] = React.useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<DistributionVehicleRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDistributionVehicles();
      setVehicles(items);
    } catch {
      toast.error("Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function nextCode(type: "LEASED" | "SPOT"): string {
    const prefix = type === "LEASED" ? "LSE" : "SPT";
    const existing = vehicles
      .map((v) => {
        const m = v.code?.match(/^([A-Z]+)-(\d+)$/);
        return m?.[1] === prefix ? parseInt(m[2], 10) : 0;
      })
      .filter((n) => n > 0);
    const next = existing.length ? Math.max(...existing) + 1 : 1;
    return `${prefix}-${String(next).padStart(3, "0")}`;
  }

  function openCreate() {
    setEditingId(null);
    const defaultType: "LEASED" | "SPOT" = "SPOT";
    setForm({ ...emptyForm(), code: nextCode(defaultType), type: defaultType });
    setSheetOpen(true);
  }

  function openEdit(v: DistributionVehicleRow & { isActive?: boolean }) {
    setEditingId(v.id);
    setForm({
      code: v.code ?? "",
      name: v.name ?? "",
      type: (v.type as "LEASED" | "SPOT") ?? "SPOT",
      registration: v.registration ?? "",
      monthlyCost: v.monthlyCost != null ? String(v.monthlyCost) : "",
      assumedTripsPerMonth: v.assumedTripsPerMonth != null ? String(v.assumedTripsPerMonth) : "12",
      currency: v.currency ?? "KES",
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim()) {
      toast.error("Vehicle code is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || undefined,
        type: form.type,
        registration: form.registration.trim() || undefined,
        monthlyCost: form.monthlyCost.trim() ? parseFloat(form.monthlyCost) : undefined,
        assumedTripsPerMonth: form.assumedTripsPerMonth.trim() ? parseInt(form.assumedTripsPerMonth) : 12,
        currency: form.currency || "KES",
      };

      if (editingId) {
        await updateDistributionVehicle(editingId, payload);
        toast.success("Vehicle updated.");
      } else {
        await createDistributionVehicle(payload);
        toast.success("Vehicle added to fleet.");
      }
      setSheetOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDistributionVehicle(deleteTarget.id);
      toast.success(`${deleteTarget.code} removed from fleet.`);
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete vehicle.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageLayout
      title="Fleet"
      description="Manage leased and spot-hire vehicles used in distribution trips."
      breadcrumbs={[
        { label: "Distribution", href: "/distribution/trips" },
        { label: "Fleet" },
      ]}
      actions={
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add vehicle
        </Button>
      }
    >
      <div className="max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Vehicles ({vehicles.length})</CardTitle>
            <CardDescription>
              Leased vehicles carry a monthly cost used for trip costing. Spot-hire vehicles are booked per trip.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            ) : vehicles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <Truck className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No vehicles yet. Add one to get started.</p>
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add vehicle
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{v.code}</span>
                        {v.name && <span className="text-sm text-muted-foreground">— {v.name}</span>}
                        <Badge variant={v.type === "LEASED" ? "default" : "secondary"} className="text-[11px]">
                          {v.type === "LEASED" ? "Leased" : "Spot hire"}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                        {v.registration && <span>Reg: {v.registration}</span>}
                        {v.type === "LEASED" && v.monthlyCost != null && (
                          <span>
                            {formatMoney(v.monthlyCost, v.currency ?? "KES")} / month
                            {v.assumedTripsPerMonth ? ` · ${v.assumedTripsPerMonth} trips assumed` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(v)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit vehicle" : "Add vehicle"}</SheetTitle>
            <SheetDescription>
              {editingId ? "Update vehicle details." : "Register a new vehicle in your fleet."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => {
                    const t = v as "LEASED" | "SPOT";
                    setForm((f) => ({
                      ...f,
                      type: t,
                      // Refresh auto-generated code only when not editing
                      ...(!editingId ? { code: nextCode(t) } : {}),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEASED">Leased</SelectItem>
                    <SelectItem value="SPOT">Spot hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Auto-generated"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name / description</Label>
              <Input
                placeholder="e.g. Isuzu NQR"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Registration plate</Label>
              <Input
                placeholder="e.g. KDA 123A"
                value={form.registration}
                onChange={(e) => setForm((f) => ({ ...f, registration: e.target.value }))}
              />
            </div>

            {form.type === "LEASED" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly cost</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.monthlyCost}
                      onChange={(e) => setForm((f) => ({ ...f, monthlyCost: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      placeholder="KES"
                      value={form.currency}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assumed trips / month</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="12"
                    value={form.assumedTripsPerMonth}
                    onChange={(e) => setForm((f) => ({ ...f, assumedTripsPerMonth: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to amortise the monthly lease cost per trip (monthly cost ÷ assumed trips).
                  </p>
                </div>
              </>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add vehicle"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Remove ${deleteTarget?.code ?? "vehicle"}?`}
        description="This will permanently remove the vehicle from your fleet. Existing trips that reference it will not be affected."
        confirmLabel={deleting ? "Removing…" : "Remove"}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageLayout>
  );
}
