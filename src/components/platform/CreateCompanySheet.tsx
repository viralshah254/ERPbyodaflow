"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { createPlatformTenantApi } from "@/lib/api/platform";
import { toast } from "sonner";
import { Building2, UserPlus } from "lucide-react";

type Mode = "choice" | "company_only" | "full";

interface CreateCompanySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestFullAccount: () => void;
  onSuccess?: () => void;
}

export function CreateCompanySheet({
  open,
  onOpenChange,
  onRequestFullAccount,
  onSuccess,
}: CreateCompanySheetProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("choice");
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [plan, setPlan] = React.useState("ENTERPRISE");
  const [status, setStatus] = React.useState("ACTIVE");
  const [saving, setSaving] = React.useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

  const errors = React.useMemo(() => {
    if (!attemptedSubmit) return { name: "" };
    if (!name.trim()) return { name: "Company name is required." };
    return { name: "" };
  }, [attemptedSubmit, name]);

  const applyRecommendedDefaults = () => {
    setPlan("ENTERPRISE");
    setStatus("ACTIVE");
  };

  React.useEffect(() => {
    if (!name.trim()) return;
    // Auto-suggest slug while it is empty or still matches previous pattern.
    if (!slug.trim()) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      setSlug(generated);
    }
  }, [name, slug]);

  const reset = () => {
    setMode("choice");
    setName("");
    setSlug("");
    setPlan("ENTERPRISE");
    setStatus("ACTIVE");
    setAttemptedSubmit(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFullAccount = () => {
    handleOpenChange(false);
    onRequestFullAccount();
  };

  const handleCompanyOnlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { id } = await createPlatformTenantApi({
        name: name.trim(),
        slug: slug.trim() || undefined,
        plan,
        status,
      });
      toast.success("Company created. Add organizations and users from the customer page.");
      handleOpenChange(false);
      onSuccess?.();
      router.push(`/platform/customers/${id}`);
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
          <SheetTitle>Create company</SheetTitle>
          <SheetDescription>
            Add a new customer account. Choose full setup with an admin user, or create the company first and add orgs later.
          </SheetDescription>
        </SheetHeader>

        {mode === "choice" && (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleFullAccount}
              className="flex w-full items-start gap-3 rounded-lg border border-input bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <UserPlus className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Full account (recommended)</p>
                <p className="text-sm text-muted-foreground">Company, first organization, and admin user. Ready to sign in.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("company_only")}
              className="flex w-full items-start gap-3 rounded-lg border border-input bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Company only</p>
                <p className="text-sm text-muted-foreground">Create the company first. Add organizations and users from the customer page.</p>
              </div>
            </button>
          </div>
        )}

        {mode === "company_only" && (
          <form onSubmit={handleCompanyOnlySubmit} className="mt-6 space-y-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("choice")}>
              ← Back
            </Button>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className={errors.name ? "border-destructive" : ""}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Slug (optional)</Label>
              <Input
                id="company-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme"
              />
              <p className="text-xs text-muted-foreground">
                Used for customer identity and links; letters/numbers/hyphens only.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span>Recommended defaults: Enterprise + Active</span>
              <Button type="button" size="sm" variant="outline" onClick={applyRecommendedDefaults}>
                Apply
              </Button>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setMode("choice")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create company"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
