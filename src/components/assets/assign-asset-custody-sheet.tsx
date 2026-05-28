"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignAssetCustodyApi } from "@/lib/api/assets";
import type { CustodyType } from "@/lib/types/assets";
import { fetchFranchiseNetworkOutlets } from "@/lib/api/cool-catch";
import { fetchEmployeesApi } from "@/lib/api/payroll";
import { toast } from "sonner";

const CUSTODY_OPTIONS: Array<{ value: CustodyType; label: string }> = [
  { value: "ORG_STOCK", label: "HQ / organization stock" },
  { value: "FRANCHISE_OUTLET", label: "Franchise outlet" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "IN_TRANSIT", label: "In transit" },
];

type AssignForm = {
  custodyType: CustodyType;
  custodianOutletId: string;
  custodianEmployeeId: string;
  effectiveFrom: string;
  monthlyEquipmentFee: string;
  securityDepositAmount: string;
  notes: string;
};

function defaultAssignForm(
  defaultCustodyType: CustodyType,
  lockedOutletId?: string
): AssignForm {
  return {
    custodyType: lockedOutletId ? "FRANCHISE_OUTLET" : defaultCustodyType,
    custodianOutletId: lockedOutletId ?? "",
    custodianEmployeeId: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    monthlyEquipmentFee: "",
    securityDepositAmount: "",
    notes: "",
  };
}

export function AssignAssetCustodySheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetLabel?: string;
  lockedOutletId?: string;
  lockedOutletName?: string;
  defaultCustodyType?: CustodyType;
  submitLabel?: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const {
    open,
    onOpenChange,
    assetId,
    assetLabel,
    lockedOutletId,
    lockedOutletName,
    defaultCustodyType = "ORG_STOCK",
    submitLabel = "Save transfer",
    onSuccess,
  } = props;

  const [outlets, setOutlets] = React.useState<Array<{ id: string; name: string }>>([]);
  const [employees, setEmployees] = React.useState<Array<{ id: string; name: string }>>([]);
  const [assignForm, setAssignForm] = React.useState<AssignForm>(() =>
    defaultAssignForm(defaultCustodyType, lockedOutletId)
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setAssignForm(defaultAssignForm(defaultCustodyType, lockedOutletId));
  }, [open, defaultCustodyType, lockedOutletId]);

  React.useEffect(() => {
    if (!open || lockedOutletId) return;
    let active = true;
    void fetchFranchiseNetworkOutlets()
      .then((rows) => {
        if (!active) return;
        setOutlets(rows.map((r) => ({ id: r.id, name: r.name })));
      })
      .catch(() => {});
    void fetchEmployeesApi()
      .then((emps) => {
        if (!active) return;
        setEmployees(emps.map((e) => ({ id: e.id, name: e.name })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, lockedOutletId]);

  const effectiveCustodyType = lockedOutletId ? "FRANCHISE_OUTLET" : assignForm.custodyType;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await assignAssetCustodyApi(assetId, {
        custodyType: effectiveCustodyType,
        effectiveFrom: assignForm.effectiveFrom,
        custodianOutletId:
          effectiveCustodyType === "FRANCHISE_OUTLET"
            ? (lockedOutletId ?? assignForm.custodianOutletId) || undefined
            : undefined,
        custodianEmployeeId:
          effectiveCustodyType === "EMPLOYEE" ? assignForm.custodianEmployeeId || undefined : undefined,
        monthlyEquipmentFee: assignForm.monthlyEquipmentFee
          ? Number(assignForm.monthlyEquipmentFee)
          : undefined,
        securityDepositAmount: assignForm.securityDepositAmount
          ? Number(assignForm.securityDepositAmount)
          : undefined,
        currency: "KES",
        notes: assignForm.notes || undefined,
      });
      toast.success("Custody updated.");
      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Transfer custody</SheetTitle>
          <SheetDescription>
            {assetLabel
              ? `${assetLabel} — creates a new assignment and closes the previous open period.`
              : "Creates a new assignment and closes the previous open period."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {!lockedOutletId && (
            <div className="space-y-2">
              <Label>Custody type</Label>
              <Select
                value={assignForm.custodyType}
                onValueChange={(v) => setAssignForm((p) => ({ ...p, custodyType: v as CustodyType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTODY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {lockedOutletId && (
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Input readOnly className="bg-muted/50" value={lockedOutletName ?? lockedOutletId} />
            </div>
          )}
          {!lockedOutletId && assignForm.custodyType === "FRANCHISE_OUTLET" && (
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select
                value={assignForm.custodianOutletId || "__none__"}
                onValueChange={(v) =>
                  setAssignForm((p) => ({ ...p, custodianOutletId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!lockedOutletId && assignForm.custodyType === "EMPLOYEE" && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={assignForm.custodianEmployeeId || "__none__"}
                onValueChange={(v) =>
                  setAssignForm((p) => ({ ...p, custodianEmployeeId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Effective from</Label>
            <Input
              type="date"
              value={assignForm.effectiveFrom}
              onChange={(e) => setAssignForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
            />
          </div>
          {effectiveCustodyType === "FRANCHISE_OUTLET" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monthly equipment fee</Label>
                <Input
                  type="number"
                  value={assignForm.monthlyEquipmentFee}
                  onChange={(e) => setAssignForm((p) => ({ ...p, monthlyEquipmentFee: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Security deposit</Label>
                <Input
                  type="number"
                  value={assignForm.securityDepositAmount}
                  onChange={(e) => setAssignForm((p) => ({ ...p, securityDepositAmount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={assignForm.notes}
              onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
