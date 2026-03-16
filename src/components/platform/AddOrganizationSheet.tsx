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
import { createPlatformOrgApi } from "@/lib/api/platform";
import { toast } from "sonner";

interface AddOrganizationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess?: () => void;
}

export function AddOrganizationSheet({
  open,
  onOpenChange,
  tenantId,
  onSuccess,
}: AddOrganizationSheetProps) {
  const [name, setName] = React.useState("");
  const [orgType, setOrgType] = React.useState("DISTRIBUTOR");
  const [orgRole, setOrgRole] = React.useState("STANDARD");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setName("");
    setOrgType("DISTRIBUTOR");
    setOrgRole("STANDARD");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Organization name is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createPlatformOrgApi({
        tenantId,
        name: name.trim(),
        orgType: orgType as "MANUFACTURER" | "DISTRIBUTOR" | "SHOP",
        orgRole: orgRole as "STANDARD" | "FRANCHISOR" | "FRANCHISEE",
      });
      toast.success("Organization staged for platform checkout.");
      toast.info(`Pending platform checkout total: ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format((result.checkout.quoteTotalCents ?? 0) / 100)}.`);
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add organization</SheetTitle>
          <SheetDescription>
            Stage a new organization under this company, then confirm it from platform billing with the rest of the batch.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Head Office"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="MANUFACTURER">Manufacturer</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="SHOP">Shop</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              value={orgRole}
              onChange={(e) => setOrgRole(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="STANDARD">Standard</option>
              <option value="FRANCHISOR">Franchisor</option>
              <option value="FRANCHISEE">Franchisee</option>
            </select>
          </div>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Staging…" : "Add to checkout"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
