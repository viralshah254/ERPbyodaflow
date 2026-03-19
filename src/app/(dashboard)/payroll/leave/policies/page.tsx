"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createLeavePolicyApi,
  fetchLeavePoliciesApi,
  updateLeavePolicyApi,
} from "@/lib/api/payroll";
import type { ExtraLeaveType, LeavePolicy, TaxCountry } from "@/lib/payroll/types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STAT_DEFAULTS: Record<TaxCountry, { sick: number; maternity: number; paternity: number }> = {
  KE: { sick: 14, maternity: 90, paternity: 14 },
  UG: { sick: 30, maternity: 60, paternity: 4 },
};

export default function LeavePoliciesPage() {
  const [policies, setPolicies] = React.useState<LeavePolicy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LeavePolicy | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [country, setCountry] = React.useState<TaxCountry>("KE");
  const [policyName, setPolicyName] = React.useState("");
  const [annualLeaveDays, setAnnualLeaveDays] = React.useState(21);
  const [sickLeaveDays, setSickLeaveDays] = React.useState(14);
  const [maternityLeaveDays, setMaternityLeaveDays] = React.useState(90);
  const [paternityLeaveDays, setPaternityLeaveDays] = React.useState(14);
  const [extraTypes, setExtraTypes] = React.useState<ExtraLeaveType[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try { setPolicies(await fetchLeavePoliciesApi()); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  React.useEffect(() => {
    if (!editing) {
      const defaults = STAT_DEFAULTS[country];
      setSickLeaveDays(defaults.sick);
      setMaternityLeaveDays(defaults.maternity);
      setPaternityLeaveDays(defaults.paternity);
    }
  }, [country, editing]);

  const openCreate = () => {
    setEditing(null);
    setPolicyName(""); setCountry("KE"); setAnnualLeaveDays(21); setExtraTypes([]);
    const d = STAT_DEFAULTS["KE"];
    setSickLeaveDays(d.sick); setMaternityLeaveDays(d.maternity); setPaternityLeaveDays(d.paternity);
    setSheetOpen(true);
  };

  const openEdit = (p: LeavePolicy) => {
    setEditing(p);
    setPolicyName(p.policyName); setCountry(p.country as TaxCountry);
    setAnnualLeaveDays(p.annualLeaveDays); setSickLeaveDays(p.sickLeaveDays);
    setMaternityLeaveDays(p.maternityLeaveDays); setPaternityLeaveDays(p.paternityLeaveDays);
    setExtraTypes(p.extraLeaveTypes ?? []);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!policyName.trim()) { toast.error("Policy name is required"); return; }
    setSaving(true);
    try {
      const payload = { country, policyName, annualLeaveDays, sickLeaveDays, maternityLeaveDays, paternityLeaveDays, extraLeaveTypes: extraTypes };
      if (editing) {
        await updateLeavePolicyApi(editing.id, payload);
        toast.success("Policy updated.");
      } else {
        await createLeavePolicyApi(payload);
        toast.success("Policy created.");
      }
      setSheetOpen(false);
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const addExtraType = () => {
    setExtraTypes((prev) => [...prev, { label: "", days: 3, isPaid: true }]);
  };

  const removeExtraType = (i: number) => {
    setExtraTypes((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateExtraType = (i: number, field: keyof ExtraLeaveType, value: string | number | boolean) => {
    setExtraTypes((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  return (
    <PageShell>
      <PageHeader
        title="Leave policies"
        description="Configure statutory and additional leave entitlements per jurisdiction."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Leave", href: "/payroll/leave/requests" },
          { label: "Policies" },
        ]}
        sticky
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New policy
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/requests">Leave requests</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading policies…</p>
        ) : policies.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Icons.CalendarDays className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No leave policies yet. Create one to set entitlements.</p>
              <Button className="mt-4" size="sm" onClick={openCreate}>Create policy</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {policies.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(p)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.policyName}</CardTitle>
                    <Badge variant="outline">{p.country === "UG" ? "🇺🇬 Uganda" : "🇰🇪 Kenya"}</Badge>
                  </div>
                  <CardDescription>Click to edit</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Annual leave</dt>
                    <dd className="font-medium">{p.annualLeaveDays} days</dd>
                    <dt className="text-muted-foreground">Sick leave</dt>
                    <dd className="font-medium">{p.sickLeaveDays} days</dd>
                    <dt className="text-muted-foreground">Maternity</dt>
                    <dd className="font-medium">{p.maternityLeaveDays} days</dd>
                    <dt className="text-muted-foreground">Paternity</dt>
                    <dd className="font-medium">{p.paternityLeaveDays} days</dd>
                    {(p.extraLeaveTypes?.length ?? 0) > 0 && (
                      <>
                        <dt className="text-muted-foreground">Extra types</dt>
                        <dd>{p.extraLeaveTypes.map((e) => `${e.label} (${e.days}d${e.isPaid ? "" : " unpaid"})`).join(", ")}</dd>
                      </>
                    )}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit policy" : "New leave policy"}</SheetTitle>
            <SheetDescription>Statutory minimums are enforced by law. Additional days can be added on top.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-5">
            <div className="space-y-1.5">
              <Label>Policy name</Label>
              <Input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="e.g. Kenya Standard Leave Policy" />
            </div>
            <div className="space-y-1.5">
              <Label>Jurisdiction</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as TaxCountry)} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KE">🇰🇪 Kenya</SelectItem>
                  <SelectItem value="UG">🇺🇬 Uganda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Statutory entitlements (minimum 21 annual)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Annual leave (days)</Label>
                  <Input type="number" min={21} value={annualLeaveDays} onChange={(e) => setAnnualLeaveDays(Math.max(21, Number(e.target.value)))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sick leave (days)</Label>
                  <Input type="number" min={0} value={sickLeaveDays} onChange={(e) => setSickLeaveDays(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Maternity leave (days)</Label>
                  <Input type="number" min={0} value={maternityLeaveDays} onChange={(e) => setMaternityLeaveDays(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Paternity leave (days)</Label>
                  <Input type="number" min={0} value={paternityLeaveDays} onChange={(e) => setPaternityLeaveDays(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Additional leave types</p>
                <Button type="button" size="sm" variant="ghost" onClick={addExtraType}>
                  <Icons.Plus className="h-3.5 w-3.5 mr-1" /> Add type
                </Button>
              </div>
              {extraTypes.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input value={t.label} onChange={(e) => updateExtraType(i, "label", e.target.value)} placeholder="e.g. Compassionate" />
                  </div>
                  <div className="w-16 space-y-1.5">
                    <Label className="text-xs">Days</Label>
                    <Input type="number" min={1} value={t.days} onChange={(e) => updateExtraType(i, "days", Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col items-center gap-1 pb-1">
                    <Label className="text-xs">Paid</Label>
                    <Switch checked={t.isPaid} onCheckedChange={(v) => updateExtraType(i, "isPaid", v)} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeExtraType(i)} className="mb-0.5">
                    <Icons.Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create policy"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
