"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import {
  createPricingRuleSettingApi,
  fetchPricingRuleSettingsApi,
  type PricingRuleSettingRow,
} from "@/lib/api/pricing-rules-settings";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PricingRulesSettingsPage() {
  const [rules, setRules] = React.useState<PricingRuleSettingRow[]>([]);
  const [newRuleName, setNewRuleName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    const items = await fetchPricingRuleSettingsApi();
    setRules(items);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load pricing rules.");
    });
  }, [reload]);

  const handleCreateRule = async () => {
    if (!newRuleName.trim()) {
      toast.error("Rule name is required.");
      return;
    }
    setSaving(true);
    try {
      await createPricingRuleSettingApi(newRuleName.trim());
      setNewRuleName("");
      await reload();
      toast.success("Pricing rule created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create pricing rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Pricing rules"
        description="Configure pricing rules that override or default tier selection."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Products" },
          { label: "Pricing rules" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain pricing rules and when they override tier selection." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/master/products">Products</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rules</CardTitle>
            <CardDescription>Customer segment, channel, or account-specific overrides saved in the backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="pricing-rule-name">Rule name</Label>
                <Input
                  id="pricing-rule-name"
                  value={newRuleName}
                  onChange={(event) => setNewRuleName(event.target.value)}
                  placeholder="e.g. Franchisee cold-chain override"
                />
              </div>
              <Button onClick={() => void handleCreateRule()} disabled={saving}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Add rule"}
              </Button>
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pricing rules configured yet.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">Managed from live pricing settings.</p>
                    </div>
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
