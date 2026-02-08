"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import {
  getMockExchangeRates,
  upsertMockExchangeRate,
  type ExchangeRateRow,
} from "@/lib/mock/exchange-rates";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

export default function ExchangeRatesSettingsPage() {
  const { settings } = useFinancialSettings();
  const [date, setDate] = React.useState(today);
  const [from, setFrom] = React.useState("USD");
  const [to, setTo] = React.useState(settings.baseCurrency);
  const [addOpen, setAddOpen] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);
  const [addForm, setAddForm] = React.useState({
    date: today,
    from: "USD",
    to: settings.baseCurrency,
    rate: 128.5,
  });

  const rates = React.useMemo(
    () => getMockExchangeRates({ date }),
    [date, refresh]
  );

  const handleImportCsv = () => {
    if (typeof window !== "undefined") {
      toast.info("Import CSV: API pending.");
    }
  };

  const handleFetchLatest = () => {
    if (typeof window !== "undefined") {
      toast.info("API not connected.");
    }
  };

  const handleAddRate = () => {
    upsertMockExchangeRate({
      date: addForm.date,
      from: addForm.from,
      to: addForm.to,
      rate: addForm.rate,
      source: "MANUAL",
    });
    setRefresh((r) => r + 1);
    setAddOpen(false);
    setAddForm({
      date: today,
      from: "USD",
      to: settings.baseCurrency,
      rate: 128.5,
    });
  };

  const columns = React.useMemo(
    () => [
      {
        id: "pair",
        header: "Pair",
        accessor: (r: ExchangeRateRow) => (
          <span className="font-medium">{r.from} → {r.to}</span>
        ),
        sticky: true,
      },
      { id: "rate", header: "Rate", accessor: (r: ExchangeRateRow) => r.rate },
      { id: "date", header: "Effective date", accessor: "date" as keyof ExchangeRateRow },
      { id: "source", header: "Source", accessor: "source" as keyof ExchangeRateRow },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Exchange rates"
        description={`Manage manual and imported rates. Base: ${settings.baseCurrency}`}
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Financial", href: "/settings/financial/currencies" },
          { label: "Exchange rates" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleFetchLatest}>
              Fetch latest rates
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportCsv}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add rate
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rates</CardTitle>
            <CardDescription>
              Filter by date. Currency pair: From / To (default To = base).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="USD"
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={settings.baseCurrency}
                />
              </div>
            </div>
            <DataTable<ExchangeRateRow>
              data={rates}
              columns={columns}
              emptyMessage="No rates for this date."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add rate</SheetTitle>
            <SheetDescription>
              Add a manual exchange rate for a date.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={addForm.date}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                value={addForm.from}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, from: e.target.value }))
                }
                placeholder="USD"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                value={addForm.to}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, to: e.target.value }))
                }
                placeholder={settings.baseCurrency}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate</Label>
              <Input
                type="number"
                step="any"
                value={addForm.rate}
                onChange={(e) =>
                  setAddForm((p) => ({
                    ...p,
                    rate: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRate}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
