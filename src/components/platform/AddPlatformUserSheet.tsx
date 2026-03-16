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
import { createPlatformUserApi } from "@/lib/api/platform";
import type { RoleDetailRow } from "@/lib/api/users-roles";
import { toast } from "sonner";

interface AddPlatformUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleDetailRow[];
  onSuccess?: () => void;
}

export function AddPlatformUserSheet({
  open,
  onOpenChange,
  roles,
  onSuccess,
}: AddPlatformUserSheetProps) {
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [roleIds, setRoleIds] = React.useState<string[]>([]);
  const [initialPassword, setInitialPassword] = React.useState("");
  const [mustChangePassword, setMustChangePassword] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoleIds([]);
    setInitialPassword("");
    setMustChangePassword(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (roleIds.length === 0) {
      toast.error("Select at least one role.");
      return;
    }
    if (!initialPassword.trim() || initialPassword.length < 8) {
      toast.error("Initial password is required (min 8 characters).");
      return;
    }
    setSaving(true);
    try {
      await createPlatformUserApi({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        roleIds,
        initialPassword: initialPassword.trim(),
        mustChangePassword,
      });
      toast.success("User created. Share the sign-in link and temporary password securely.");
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (id: string) => {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add platform user</SheetTitle>
          <SheetDescription>
            Create a new team member. They will be able to sign in with the email and temporary password you set.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pu-email">Email</Label>
            <Input
              id="pu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@odaflow.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pu-first">First name</Label>
              <Input
                id="pu-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pu-last">Last name</Label>
              <Input
                id="pu-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles. Create platform roles first (e.g. via create-platform-owner script).</p>
              ) : (
                roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pu-password">Temporary password</Label>
            <Input
              id="pu-password"
              type="password"
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Share this securely. User will be prompted to change it on first sign-in if enabled.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Require password change on first sign-in</span>
          </label>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || roles.length === 0}>
              {saving ? "Creating…" : "Add user"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
