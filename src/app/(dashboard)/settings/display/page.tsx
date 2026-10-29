"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchOrgProfileApi, saveOrgProfileApi } from "@/lib/api/org";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function applyCapsOnProduct(capsOnProduct: boolean) {
  const org = useAuthStore.getState().org;
  if (!org || org.capsOnProduct === capsOnProduct) return;
  useAuthStore.getState().setOrg({ ...org, capsOnProduct });
}

export default function DisplaySettingsPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canManage = permissions.includes("admin.settings") || permissions.includes("*");

  const [capsOnProduct, setCapsOnProduct] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void fetchOrgProfileApi()
      .then((profile) => {
        if (cancelled) return;
        setCapsOnProduct(profile.capsOnProduct);
        applyCapsOnProduct(profile.capsOnProduct);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = await saveOrgProfileApi({ capsOnProduct });
      setCapsOnProduct(profile.capsOnProduct);
      applyCapsOnProduct(profile.capsOnProduct);
      toast.success("Display saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Display"
      description="How product names appear across the organisation"
      breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Display" }]}
    >
      <Card>
          <CardHeader>
            <CardTitle>Product names</CardTitle>
            <CardDescription>
              Choose how product names are shown. The spelling saved on each product stays as entered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="caps-on-product">Product names in capitals</Label>
                <p className="text-sm text-muted-foreground">
                  Show product names in capitals on lists, orders, and documents.
                </p>
              </div>
              <Switch
                id="caps-on-product"
                checked={capsOnProduct}
                onCheckedChange={setCapsOnProduct}
                disabled={loading || !canManage}
                aria-label="Show product names in capitals"
              />
            </div>
            <Button disabled={saving || loading || !canManage} onClick={() => void handleSave()}>
              <Icons.Save className="mr-2 h-4 w-4" />
              Save changes
            </Button>
            {!canManage && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Icons.Info className="mt-0.5 h-4 w-4 shrink-0" />
                Your role can view display settings. Ask an administrator to change them.
              </p>
            )}
          </CardContent>
      </Card>
    </PageLayout>
  );
}
