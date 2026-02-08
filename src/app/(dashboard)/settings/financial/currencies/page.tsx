"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import type { CurrencyCode } from "@/lib/org/financial-settings";
import { BaseCurrencyCard } from "@/components/settings/financial/BaseCurrencyCard";
import { CurrencyTable } from "@/components/settings/financial/CurrencyTable";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CurrenciesSettingsPage() {
  const { settings, update } = useFinancialSettings();
  const [addOpen, setAddOpen] = React.useState(false);

  const handleBaseChange = React.useCallback(
    (code: CurrencyCode) => {
      const next = [...new Set([...settings.enabledCurrencies, code])];
      update({ baseCurrency: code, enabledCurrencies: next });
    },
    [settings.enabledCurrencies, update]
  );

  const handleToggle = React.useCallback(
    (code: CurrencyCode, enabled: boolean) => {
      if (!enabled && settings.baseCurrency === code) return;
      const next = enabled
        ? [...new Set([...settings.enabledCurrencies, code])]
        : settings.enabledCurrencies.filter((c) => c !== code);
      update({ enabledCurrencies: next });
    },
    [settings.baseCurrency, settings.enabledCurrencies, update]
  );

  const handleAddCurrency = () => {
    setAddOpen(true);
  };

  const handleAddSave = () => {
    if (typeof window !== "undefined") {
      toast.info("Add currency (stub). API pending.");
    }
    setAddOpen(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="Currencies"
        description="Set base currency and enabled currencies for this business."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Financial", href: "/settings/financial/currencies" },
          { label: "Currencies" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-6">
        <BaseCurrencyCard
          value={settings.baseCurrency}
          onChange={handleBaseChange}
          enabledCurrencies={settings.enabledCurrencies}
        />
        <Card>
          <CardHeader>
            <CardTitle>Enabled currencies</CardTitle>
            <CardDescription>
              Enable or disable currencies for documents and reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurrencyTable
              enabledCurrencies={settings.enabledCurrencies}
              onToggle={handleToggle}
              onAddCurrency={handleAddCurrency}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add currency</SheetTitle>
            <SheetDescription>
              Add a new currency. API pending — stub only.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="e.g. CHF" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Swiss Franc" />
            </div>
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input placeholder="e.g. CHF" />
            </div>
            <div className="space-y-2">
              <Label>Decimals</Label>
              <Input type="number" placeholder="2" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSave}>Add (stub)</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
