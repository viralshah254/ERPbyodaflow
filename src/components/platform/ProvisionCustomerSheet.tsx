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
import { provisionPlatformCustomerApi, type PlatformOrgRow } from "@/lib/api/platform";
import { toast } from "sonner";

type ProvisionFormState = {
  tenantName: string;
  slug: string;
  plan: string;
  status: string;
  region: string;
  currency: string;
  timeZone: string;
  edition: string;
  defaultTemplateId: string;
  enabledModules: string;
  featureFlags: string;
  defaultNav: string;
  orgName: string;
  orgType: string;
  orgRole: string;
  branchName: string;
  branchCode: string;
  roleName: string;
  adminEmail: string;
  initialPassword: string;
  mustChangePassword: boolean;
  adminFirstName: string;
  adminLastName: string;
  templateId: string;
};

const emptyForm = (): ProvisionFormState => ({
  tenantName: "",
  slug: "",
  plan: "ENTERPRISE",
  status: "ACTIVE",
  region: "KE",
  currency: "KES",
  timeZone: "Africa/Nairobi",
  edition: "",
  defaultTemplateId: "",
  enabledModules: "dashboard, docs, inventory, sales, purchasing, finance, reports, settings",
  featureFlags: "",
  defaultNav: "core, docs, inventory, sales, purchasing, finance, reports, settings",
  orgName: "",
  orgType: "DISTRIBUTOR",
  orgRole: "STANDARD",
  branchName: "Main Branch",
  branchCode: "MAIN",
  roleName: "Owner",
  adminEmail: "",
  initialPassword: "",
  mustChangePassword: true,
  adminFirstName: "",
  adminLastName: "",
  templateId: "fmcg-distributor",
});

function parseList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseFlags(value: string): Record<string, boolean> {
  return Object.fromEntries(
    value.split(",").map((s) => s.trim()).filter(Boolean).map((key) => [key, true])
  );
}

interface ProvisionCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ProvisionErrors = Partial<Record<keyof ProvisionFormState, string>>;

function validateProvisionForm(form: ProvisionFormState, attempted: boolean): ProvisionErrors {
  if (!attempted) return {};
  const err: ProvisionErrors = {};
  if (!form.tenantName.trim()) err.tenantName = "Business owner name is required.";
  if (!form.orgName.trim()) err.orgName = "Company name is required.";
  if (!form.adminEmail.trim()) err.adminEmail = "Admin email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) err.adminEmail = "Enter a valid email address.";
  if (!form.initialPassword.trim()) err.initialPassword = "Temporary password is required.";
  else if (form.initialPassword.trim().length < 8) err.initialPassword = "Password must be at least 8 characters.";
  if (!form.templateId.trim()) err.templateId = "Please select an initial template.";
  return err;
}

export function ProvisionCustomerSheet({ open, onOpenChange, onSuccess }: ProvisionCustomerSheetProps) {
  const [form, setForm] = React.useState<ProvisionFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

  const errors = React.useMemo(() => validateProvisionForm(form, attemptedSubmit), [form, attemptedSubmit]);

  React.useEffect(() => {
    if (!open) setAttemptedSubmit(false);
  }, [open]);

  React.useEffect(() => {
    if (!form.tenantName.trim()) return;
    if (form.slug.trim()) return;
    const generated = form.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    setForm((prev) => ({ ...prev, slug: generated }));
  }, [form.tenantName, form.slug]);

  const applyDistributorDefaults = () => {
    setForm((prev) => ({
      ...prev,
      orgType: "DISTRIBUTOR",
      orgRole: "STANDARD",
      templateId: "fmcg-distributor",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      branchName: "Main Branch",
      branchCode: "MAIN",
    }));
  };

  const applyManufacturerDefaults = () => {
    setForm((prev) => ({
      ...prev,
      orgType: "MANUFACTURER",
      orgRole: "STANDARD",
      templateId: "fmcg-manufacturer",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      branchName: "Main Plant",
      branchCode: "MAIN",
    }));
  };

  const submit = async () => {
    setAttemptedSubmit(true);
    const errs = validateProvisionForm(form, true);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const result = await provisionPlatformCustomerApi({
        tenantName: form.tenantName.trim(),
        slug: form.slug.trim() || undefined,
        plan: form.plan,
        status: form.status,
        region: form.region || undefined,
        currency: form.currency || undefined,
        timeZone: form.timeZone || undefined,
        edition: form.edition.trim() || undefined,
        defaultTemplateId: form.defaultTemplateId.trim() || undefined,
        enabledModules: parseList(form.enabledModules),
        featureFlags: parseFlags(form.featureFlags),
        defaultNav: parseList(form.defaultNav),
        orgName: form.orgName.trim(),
        orgType: form.orgType as PlatformOrgRow["orgType"],
        orgRole: form.orgRole as PlatformOrgRow["orgRole"],
        branchName: form.branchName || undefined,
        branchCode: form.branchCode || undefined,
        roleName: form.roleName || undefined,
        adminEmail: form.adminEmail.trim().toLowerCase(),
        initialPassword: form.initialPassword.trim(),
        mustChangePassword: form.mustChangePassword,
        adminFirstName: form.adminFirstName.trim() || undefined,
        adminLastName: form.adminLastName.trim() || undefined,
        templateId: form.templateId.trim(),
      });
      setForm(emptyForm());
      setAttemptedSubmit(false);
      onOpenChange(false);
      onSuccess?.();
      toast.success("Customer provisioned. Share credentials securely and ask admin to change password on first login.");
      if (result.billingImpact?.invoiceId) {
        toast.info(
          result.billingImpact.lineItems?.length
            ? `Billing created: ${result.billingImpact.lineItems.map((line) => line.description).join(", ")}`
            : `Billing linked: invoice ${result.billingImpact.invoiceId.slice(0, 8)}… created`
        );
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Provision customer</SheetTitle>
          <SheetDescription>
            Enter business owner name (tenant) and company name (org), then branch, owner role, admin user, and Firebase credentials. Company name is the main identifier for the customer.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Quick setup: create first customer org + first admin login. Use defaults to avoid manual setup.
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Billing automation: standard orgs bill active users monthly, while franchise outlets bill $50/month with 2 included users and prorated mid-month activation.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={applyDistributorDefaults}>
              Distributor defaults
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={applyManufacturerDefaults}>
              Manufacturer defaults
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Business owner name</Label>
              <Input
                value={form.tenantName}
                onChange={(e) => setForm((p) => ({ ...p, tenantName: e.target.value }))}
                placeholder="e.g. Joram Kabach"
                className={errors.tenantName ? "border-destructive" : ""}
                aria-invalid={!!errors.tenantName}
              />
              <p className="text-xs text-muted-foreground">Used as tenant display name in the platform.</p>
              {errors.tenantName && (
                <p className="text-xs text-destructive" role="alert">{errors.tenantName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Auto-generated from business owner name; editable.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <select
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input
              value={form.orgName}
              onChange={(e) => setForm((p) => ({ ...p, orgName: e.target.value }))}
              placeholder="e.g. Cool Catch Distributors Ltd"
              className={errors.orgName ? "border-destructive" : ""}
              aria-invalid={!!errors.orgName}
            />
            <p className="text-xs text-muted-foreground">Legal or trading name of the company (organization).</p>
            {errors.orgName && (
              <p className="text-xs text-destructive" role="alert">{errors.orgName}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Org type</Label>
              <select
                value={form.orgType}
                onChange={(e) => setForm((p) => ({ ...p, orgType: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="SHOP">Shop</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Org role</Label>
              <select
                value={form.orgRole}
                onChange={(e) => setForm((p) => ({ ...p, orgRole: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="STANDARD">Standard</option>
                <option value="FRANCHISOR">Franchisor</option>
                <option value="FRANCHISEE">Franchisee</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Admin email</Label>
              <Input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                className={errors.adminEmail ? "border-destructive" : ""}
                aria-invalid={!!errors.adminEmail}
              />
              {errors.adminEmail && (
                <p className="text-xs text-destructive" role="alert">{errors.adminEmail}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role name</Label>
              <Input value={form.roleName} onChange={(e) => setForm((p) => ({ ...p, roleName: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={form.initialPassword}
                onChange={(e) => setForm((p) => ({ ...p, initialPassword: e.target.value }))}
                placeholder="Minimum 8 characters"
                className={errors.initialPassword ? "border-destructive" : ""}
                aria-invalid={!!errors.initialPassword}
              />
              {errors.initialPassword && (
                <p className="text-xs text-destructive" role="alert">{errors.initialPassword}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Initial template</Label>
              <select
                value={form.templateId}
                onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
                className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errors.templateId ? "border-destructive" : "border-input"}`}
                aria-invalid={!!errors.templateId}
              >
                <option value="fmcg-distributor">FMCG Distributor</option>
                <option value="fmcg-manufacturer">FMCG Manufacturer</option>
                <option value="retail-multi-store">Retail Multi-Store</option>
                <option value="seafood-distributor">Seafood Distributor</option>
              </select>
              {errors.templateId && (
                <p className="text-xs text-destructive" role="alert">{errors.templateId}</p>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.mustChangePassword}
              onChange={(e) => setForm((p) => ({ ...p, mustChangePassword: e.target.checked }))}
              className="rounded border-input"
            />
            <span className="text-sm">Require password change on first sign-in</span>
          </label>
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
            Tenant admins will manage teams, franchise setup, and operations after first login.
          </div>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </button>
          {showAdvanced ? (
            <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Admin first name</Label>
              <Input value={form.adminFirstName} onChange={(e) => setForm((p) => ({ ...p, adminFirstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Admin last name</Label>
              <Input value={form.adminLastName} onChange={(e) => setForm((p) => ({ ...p, adminLastName: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Branch name</Label>
              <Input value={form.branchName} onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Branch code</Label>
              <Input value={form.branchCode} onChange={(e) => setForm((p) => ({ ...p, branchCode: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Enabled modules</Label>
            <Input value={form.enabledModules} onChange={(e) => setForm((p) => ({ ...p, enabledModules: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Feature flags</Label>
            <Input value={form.featureFlags} onChange={(e) => setForm((p) => ({ ...p, featureFlags: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Default nav</Label>
            <Input value={form.defaultNav} onChange={(e) => setForm((p) => ({ ...p, defaultNav: e.target.value }))} />
          </div>
            </>
          ) : null}
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving}>Provision</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
