"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  getAllTemplates,
  PERISHABLE_DISTRIBUTION_TEMPLATE_IDS,
} from "@/config/industryTemplates/templates";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { fetchOrgProfileApi, saveOrgProfileApi } from "@/lib/api/org";
import { saveCurrentOrgContext } from "@/lib/api/context";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function OrganizationPage() {
  const { templateId, template, applyTemplate, hydrateFromBackend } = useOrgContextStore();
  const templates = React.useMemo(() => getAllTemplates(), []);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [registrationNumber, setRegistrationNumber] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const profile = await fetchOrgProfileApi();
        if (cancelled) return;
        setName(profile.name);
        setTaxId(profile.taxId);
        setRegistrationNumber(profile.registrationNumber);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOrgProfileApi({
        name,
        taxId,
        registrationNumber,
      });
      toast.success("Organization saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Organization Profile"
      description="Manage your organization details"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID</Label>
              <Input
                id="tax-id"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Enter tax ID"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <Input
                id="registration"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Enter registration number"
                disabled={loading}
              />
            </div>
            <Button disabled={saving || loading} onClick={handleSave}>
              <Icons.Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Industry template</CardTitle>
            <CardDescription>
              The template controls which modules and nav items you see (e.g. Franchise, Subcontracting). Switch to <strong>Cool Catch</strong> to access commission, VMI, cash-to-weight audit, and subcontracting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {template && (
              <p className="text-sm text-muted-foreground">
                Current: <strong>{template.name}</strong>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  variant={templateId === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    applyTemplate(t.id);
                    if (!isApiConfigured()) {
                      toast.success(`Switched to ${t.name}`);
                      return;
                    }
                    try {
                      const orgContext = await saveCurrentOrgContext({
                        templateId: t.id,
                        enabledModules: t.enabledModules,
                        featureFlags: t.featureFlags,
                        terminology: t.terminology,
                        defaultNav: t.defaultNav,
                      });
                      hydrateFromBackend({
                        orgType: t.orgType,
                        templateId: orgContext.templateId,
                        enabledModules: orgContext.enabledModules,
                        featureFlags: orgContext.featureFlags,
                        terminology: orgContext.terminology,
                        defaultNav: orgContext.defaultNav,
                      });
                      toast.success(`Switched to ${t.name}`);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  {PERISHABLE_DISTRIBUTION_TEMPLATE_IDS.includes(
                    t.id as (typeof PERISHABLE_DISTRIBUTION_TEMPLATE_IDS)[number]
                  ) && <Icons.Fish className="mr-1.5 h-4 w-4" />}
                  {t.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





