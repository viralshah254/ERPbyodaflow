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
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CompliancePage() {
  const [taxId, setTaxId] = React.useState("");
  const [eInvoice, setEInvoice] = React.useState(false);
  const [withholdingEnabled, setWithholdingEnabled] = React.useState(false);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      toast.info("Save (stub). API pending.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Compliance"
        description="Tax IDs, invoice templates, e-invoicing, withholding tax. Placeholders."
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax IDs</CardTitle>
            <CardDescription>Organization tax identifiers (stub).</CardDescription>
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
            <CardDescription>Document print templates selector (stub).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Default invoice template</Label>
              <Select defaultValue="standard">
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
            <CardDescription>Toggle (stub). No real integration.</CardDescription>
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
            <CardDescription>Ties to Taxes page. Toggle (stub).</CardDescription>
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
