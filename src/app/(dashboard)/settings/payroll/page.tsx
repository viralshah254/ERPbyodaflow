"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { fetchPayrollSettingsApi, savePayrollSettingsApi } from "@/lib/api/payroll";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";

export default function PayrollSettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = React.useState("KES");
  const [payPeriod, setPayPeriod] = React.useState<"MONTHLY" | "BIWEEKLY" | "WEEKLY">("MONTHLY");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) return;
    fetchPayrollSettingsApi()
      .then((s) => {
        setDefaultCurrency(s.currency);
        setPayPeriod(s.payFrequency);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!isApiConfigured()) {
      toast.info("Set NEXT_PUBLIC_API_URL to save payroll settings.");
      return;
    }
    setSaving(true);
    try {
      await savePayrollSettingsApi({ currency: defaultCurrency, payFrequency: payPeriod });
      toast.success("Payroll settings saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Payroll settings"
        description="Company-level payroll config."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Payroll" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <ExplainThis prompt="Explain payroll settings and pay period." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Payroll</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defaults</CardTitle>
            <CardDescription>Default currency, pay period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pay period</Label>
              <Select value={payPeriod} onValueChange={(v) => setPayPeriod(v as "MONTHLY" | "BIWEEKLY" | "WEEKLY")}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
