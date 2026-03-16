"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import {
  fetchComplianceSettingsApi,
  updateComplianceSettingsApi,
} from "@/lib/api/compliance";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CompliancePage() {
  const [taxId, setTaxId] = React.useState("");
  const [invoiceTemplate, setInvoiceTemplate] = React.useState("standard");
  const [eInvoice, setEInvoice] = React.useState(false);
  const [withholdingEnabled, setWithholdingEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchComplianceSettingsApi()
      .then((settings) => {
        if (cancelled) return;
        setTaxId(settings.taxId ?? "");
        setInvoiceTemplate(settings.invoiceTemplate ?? "standard");
        setEInvoice(settings.eInvoice === true);
        setWithholdingEnabled(settings.withholdingEnabled === true);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load compliance settings.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    try {
      await updateComplianceSettingsApi({
        taxId,
        invoiceTemplate,
        eInvoice,
        withholdingEnabled,
      });
      toast.success("Compliance settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save compliance settings.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Compliance"
        description="Tax IDs, invoice templates, e-invoicing, and withholding control settings."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Compliance" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain compliance settings: tax IDs, e-invoicing, withholding tax." label="Explain compliance" />
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {loading ? <p className="text-sm text-muted-foreground">Loading settings...</p> : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax IDs</CardTitle>
            <CardDescription>Organization tax identifiers used for statutory documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tax PIN / VAT number</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="e.g. P051234567X" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice templates</CardTitle>
            <CardDescription>Default document print layouts for operational entities.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Default invoice template</Label>
              <Select value={invoiceTemplate} onValueChange={setInvoiceTemplate}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="kenya">Kenya KRA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">E-invoicing</CardTitle>
            <CardDescription>Enable or disable e-invoice controls in the document flow.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Checkbox id="e-inv" checked={eInvoice} onCheckedChange={(c) => setEInvoice(c === true)} />
              <Label htmlFor="e-inv">Enable e-invoicing</Label>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withholding tax</CardTitle>
            <CardDescription>Control withholding behavior before tax configuration and posting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Checkbox id="wht" checked={withholdingEnabled} onCheckedChange={(c) => setWithholdingEnabled(c === true)} />
              <Label htmlFor="wht">Enable withholding tax</Label>
            </div>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/settings/financial/taxes">Configure taxes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
