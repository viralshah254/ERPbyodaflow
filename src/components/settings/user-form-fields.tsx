"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneWithCountryCode } from "@/components/forms/phone-with-country-code";
import type { RoleDetailRow } from "@/lib/api/users-roles";

export type UserFormState = {
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  copilotEnabled: boolean;
  roleIds: string[];
  phoneNumber: string;
  nationalId: string;
  employeeCode: string;
};

export type UserFormFieldsProps = {
  form: UserFormState;
  onChange: React.Dispatch<React.SetStateAction<UserFormState>>;
  sortedRoles: RoleDetailRow[];
  copilotProductEnabled: boolean;
  /** When false, Owner role is hidden from assignable list unless editingUserIsOwner. */
  canAssignOwnerRole: boolean;
  isEdit: boolean;
};

export function UserFormFields({
  form,
  onChange,
  sortedRoles,
  copilotProductEnabled,
  canAssignOwnerRole,
  isEdit,
}: UserFormFieldsProps) {
  const assignableRoles = sortedRoles.filter((r) => {
    if (r.name === "Owner") return canAssignOwnerRole;
    return true;
  });

  const toggleRole = (roleId: string) => {
    onChange((p) => ({
      ...p,
      roleIds: p.roleIds.includes(roleId)
        ? p.roleIds.filter((id) => id !== roleId)
        : [...p.roleIds, roleId],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          value={form.email}
          onChange={(e) => onChange((p) => ({ ...p, email: e.target.value }))}
          placeholder="user@acme.com"
          type="email"
          autoComplete="email"
          readOnly={isEdit}
          className={isEdit ? "bg-muted" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First name</Label>
          <Input
            value={form.firstName}
            onChange={(e) => onChange((p) => ({ ...p, firstName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Last name</Label>
          <Input
            value={form.lastName}
            onChange={(e) => onChange((p) => ({ ...p, lastName: e.target.value }))}
          />
        </div>
      </div>

      <div className={copilotProductEnabled ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            value={form.status}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                status: e.target.value as UserFormState["status"],
              }))
            }
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        {copilotProductEnabled ? (
          <div className="space-y-2">
            <Label>Billing add-ons</Label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={form.copilotEnabled}
                onCheckedChange={(checked) =>
                  onChange((p) => ({ ...p, copilotEnabled: checked === true }))
                }
              />
              <span className="text-sm">Enable Copilot for this user</span>
            </label>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Roles</Label>
        {assignableRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No roles yet. Open the Roles tab and run &quot;Provision standard roles&quot; first.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
            {assignableRoles.map((r) => (
              <label key={r.id} className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={form.roleIds.includes(r.id)}
                  onCheckedChange={() => toggleRole(r.id)}
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium">{r.name}</span>
                  {r.templateKey ? (
                    <span className="text-muted-foreground"> (standard)</span>
                  ) : null}
                  {r.description ? (
                    <span className="block text-xs text-muted-foreground">{r.description}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Select one or more roles. Permissions are combined. Mobile app routing uses the
          highest-priority assigned role. New users are staged for checkout first — nothing is
          activated or billed until you confirm the pending checkout from Billing.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Phone number</Label>
        <PhoneWithCountryCode
          id="user-phone"
          value={form.phoneNumber}
          onChange={(full) => onChange((p) => ({ ...p, phoneNumber: full }))}
        />
      </div>

      <div className="space-y-2">
        <Label>ID number</Label>
        <Input
          value={form.nationalId}
          onChange={(e) => onChange((p) => ({ ...p, nationalId: e.target.value }))}
          placeholder="National ID / passport number"
        />
      </div>

      <div className="space-y-2">
        <Label>
          Employee code <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          value={form.employeeCode}
          onChange={(e) => onChange((p) => ({ ...p, employeeCode: e.target.value }))}
          placeholder="e.g. EMP-001"
        />
      </div>
    </div>
  );
}
