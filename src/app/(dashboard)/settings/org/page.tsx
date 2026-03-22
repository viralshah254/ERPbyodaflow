"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PERISHABLE_DISTRIBUTION_TEMPLATE_IDS,
  getAllTemplates,
} from "@/config/industryTemplates/templates";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { fetchOrgProfileApi, saveOrgProfileApi } from "@/lib/api/org";
import { saveCurrentOrgContext } from "@/lib/api/context";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const ALL_TEMPLATES = getAllTemplates();

export default function OrganizationPage() {
  const { templateId, template, hydrateFromBackend } = useOrgContextStore();
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [registrationNumber, setRegistrationNumber] = React.useState("");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [savingTemplate, setSavingTemplate] = React.useState(false);

  React.useEffect(() => {
    if (templateId) setSelectedTemplateId(templateId);
  }, [templateId]);

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
            <CardTitle>Industry Template</CardTitle>
            <CardDescription>
              Controls which modules, feature flags, and terminology are active for your organisation. Changes take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ALL_TEMPLATES.map((t) => {
                const isActive = selectedTemplateId === t.id;
                const isPerishable = PERISHABLE_DISTRIBUTION_TEMPLATE_IDS.includes(
                  t.id as (typeof PERISHABLE_DISTRIBUTION_TEMPLATE_IDS)[number]
                );
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {isPerishable ? (
                        <Icons.Fish className="h-4 w-4 shrink-0 text-blue-500" />
                      ) : (
                        <Icons.Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{t.name}</span>
                      {isActive && (
                        <Badge variant="default" className="ml-auto text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </button>
                );
              })}
            </div>
            {selectedTemplateId && selectedTemplateId !== templateId && (
              <Button
                size="sm"
                disabled={savingTemplate}
                onClick={async () => {
                  setSavingTemplate(true);
                  try {
                    const updated = await saveCurrentOrgContext({ templateId: selectedTemplateId });
                    hydrateFromBackend({
                      templateId: updated.templateId,
                      enabledModules: updated.enabledModules,
                      featureFlags: updated.featureFlags,
                      terminology: updated.terminology,
                      defaultNav: updated.defaultNav,
                      orgRole: updated.orgRole,
                    });
                    toast.success("Industry template updated. The page will reflect new modules.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setSavingTemplate(false);
                  }
                }}
              >
                <Icons.Check className="mr-2 h-3.5 w-3.5" />
                Apply Template
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





