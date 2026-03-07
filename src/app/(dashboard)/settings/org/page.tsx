"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getAllTemplates } from "@/config/industryTemplates/templates";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { orgSave } from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function OrganizationPage() {
  const { templateId, template, applyTemplate } = useOrgContextStore();
  const templates = React.useMemo(() => getAllTemplates(), []);
  const [saving, setSaving] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const taxIdRef = React.useRef<HTMLInputElement>(null);
  const registrationRef = React.useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await orgSave({
        name: nameRef.current?.value ?? "",
        taxId: taxIdRef.current?.value ?? "",
        registrationNumber: registrationRef.current?.value ?? "",
      });
      toast.success("Organization saved.");
    } catch (e) {
      if ((e as Error).message === "STUB") toast.info("Save (stub). API pending.");
      else toast.error((e as Error).message);
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
              <Input id="name" ref={nameRef} defaultValue="Acme Manufacturing" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID</Label>
              <Input id="tax-id" ref={taxIdRef} placeholder="Enter tax ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <Input id="registration" ref={registrationRef} placeholder="Enter registration number" />
            </div>
            <Button disabled={saving} onClick={handleSave}>
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
                  onClick={() => {
                    applyTemplate(t.id);
                    toast.success(`Switched to ${t.name}`);
                  }}
                >
                  {t.id === "cool-catch" && <Icons.Fish className="mr-1.5 h-4 w-4" />}
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





