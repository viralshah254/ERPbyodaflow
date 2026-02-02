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
import * as Icons from "lucide-react";

export default function PayrollSettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = React.useState("KES");
  const [payPeriod, setPayPeriod] = React.useState("MONTHLY");

  const handleSave = () => {
    window.alert("Save (stub). API pending.");
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
            <ExplainThis prompt="Explain payroll settings and pay period." label="Explain" />
            <Button size="sm" onClick={handleSave}>Save</Button>
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
              <Select value={payPeriod} onValueChange={setPayPeriod}>
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
