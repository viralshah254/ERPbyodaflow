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
import { toast } from "sonner";
import * as Icons from "lucide-react";

const ALL_TEMPLATES = getAllTemplates();

export default function OrganizationPage() {
  const { templateId, template } = useOrgContextStore();
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
            <CardTitle>Industry Template</CardTitle>
            <CardDescription>
              The active template controls which modules, feature flags, and terminology are available for your organisation. Contact Odaflow to change your template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const active = template ?? ALL_TEMPLATES.find((t) => t.id === templateId) ?? null;
              const isPerishable = active && PERISHABLE_DISTRIBUTION_TEMPLATE_IDS.includes(
                active.id as (typeof PERISHABLE_DISTRIBUTION_TEMPLATE_IDS)[number]
              );
              return (
                <div className="flex items-start gap-3 rounded-lg border border-primary bg-primary/5 ring-1 ring-primary p-4 max-w-sm">
                  <div className="mt-0.5">
                    {isPerishable ? (
                      <Icons.Fish className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Icons.Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {active?.name ?? templateId ?? "—"}
                      </span>
                      <Badge variant="default" className="text-[10px]">Active</Badge>
                    </div>
                    {active?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{active.description}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





