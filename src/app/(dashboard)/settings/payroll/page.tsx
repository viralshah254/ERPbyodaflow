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
import * as Icons from "lucide-react";

export default function PayrollSettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = React.useState("KES");
  const [payPeriod, setPayPeriod] = React.useState<"MONTHLY" | "BIWEEKLY" | "WEEKLY">("MONTHLY");
  const [defaultTaxCountry, setDefaultTaxCountry] = React.useState<"KE" | "UG">("KE");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) return;
    fetchPayrollSettingsApi()
      .then((s) => {
        setDefaultCurrency(s.currency);
        setPayPeriod(s.payFrequency);
        setDefaultTaxCountry((s.defaultTaxCountry as "KE" | "UG") ?? "KE");
      })
      .catch(() => {});
  }, []);

  // Sync default currency to country
  React.useEffect(() => {
    setDefaultCurrency(defaultTaxCountry === "UG" ? "UGX" : "KES");
  }, [defaultTaxCountry]);

  const handleSave = async () => {
    if (!isApiConfigured()) {
      toast.info("Set NEXT_PUBLIC_API_URL to save payroll settings.");
      return;
    }
    setSaving(true);
    try {
      await savePayrollSettingsApi({ currency: defaultCurrency, payFrequency: payPeriod, defaultTaxCountry });
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
        description="Company-level payroll configuration — jurisdiction, currency, and pay frequency."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Payroll" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save settings"}
            </Button>
            <ExplainThis prompt="Explain payroll settings, jurisdiction, and statutory tax defaults." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Payroll</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jurisdiction &amp; defaults</CardTitle>
            <CardDescription>
              These defaults are used when creating new employees. Individual employees can be overridden per-record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Default tax country / jurisdiction</Label>
              <Select value={defaultTaxCountry} onValueChange={(v) => setDefaultTaxCountry(v as "KE" | "UG")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KE">🇰🇪 Kenya</SelectItem>
                  <SelectItem value="UG">🇺🇬 Uganda</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kenya uses KES, PAYE, NSSF (2023), SHIF, AHL. Uganda uses UGX, PAYE (URA), NSSF 5%+10%.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Default currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="UGX">UGX</SelectItem>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave management</CardTitle>
            <CardDescription>
              Set up leave policies and entitlements for your organisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure statutory annual leave (min 21 days), sick leave, maternity, paternity, and any additional paid/unpaid leave types.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/payroll/leave/policies">
                  <Icons.CalendarDays className="mr-2 h-4 w-4" />
                  Manage leave policies
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/payroll/leave/requests">
                  <Icons.ClipboardList className="mr-2 h-4 w-4" />
                  View leave requests
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statutory rates reference</CardTitle>
            <CardDescription>View current PAYE bands, NSSF tiers, SHIF, AHL for Kenya and Uganda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/statutories">
                <Icons.BookOpen className="mr-2 h-4 w-4" />
                View statutory rates
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
