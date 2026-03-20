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
  fetchFinancialExchangeRatesApi,
  fetchFinancialCurrenciesApi,
  saveFinancialExchangeRateApi,
  syncFinancialExchangeRatesApi,
  type FinancialExchangeRateRow,
} from "@/lib/api/financial-settings";
import { CURRENCY_LIST } from "@/lib/data/currencies";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

export default function ExchangeRatesSettingsPage() {
  const { settings } = useFinancialSettings();
  const [date, setDate] = React.useState(today);
  const [from, setFrom] = React.useState("USD");
  const [to, setTo] = React.useState(settings.baseCurrency);
  const [addOpen, setAddOpen] = React.useState(false);
  const [rates, setRates] = React.useState<FinancialExchangeRateRow[]>([]);
  const [refresh, setRefresh] = React.useState(0);
  const [addForm, setAddForm] = React.useState({
    date: today,
    from: "USD",
    to: settings.baseCurrency,
    rate: 1,
  });
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const [currencies, setCurrencies] = React.useState<{ code: string; name: string }[]>([]);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setCurrencies(CURRENCY_LIST);
      return;
    }
    fetchFinancialCurrenciesApi()
      .then((rows) => setCurrencies(rows.length ? rows : CURRENCY_LIST))
      .catch(() => setCurrencies(CURRENCY_LIST));
  }, []);

  const currencyOptions = React.useMemo(
    () => currencies.map((c) => ({
      id: c.code,
      label: c.name && c.name !== c.code ? `${c.code} — ${c.name}` : c.code,
    })),
    [currencies]
  );

  React.useEffect(() => {
    setTo(settings.baseCurrency);
    setAddForm((current) => ({ ...current, to: settings.baseCurrency }));
  }, [settings.baseCurrency]);

  React.useEffect(() => {
    let cancelled = false;
    fetchFinancialExchangeRatesApi({
      date,
      fromCurrency: from.trim() || undefined,
      toCurrency: to.trim() || undefined,
    })
      .then((items) => {
        if (!cancelled) setRates(items);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [date, from, to, refresh]);

  const handleImportCsv = () => {
    if (isApiConfigured()) {
      importInputRef.current?.click();
      return;
    }
    toast.info("Import CSV: set NEXT_PUBLIC_API_URL to use backend.");
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(
      "/api/settings/financial/exchange-rates/import",
      file,
      (data) => {
        if (data.imported != null) toast.success(`Imported ${data.imported} rate(s).`);
        else if (data.jobId) toast.success("Import queued. " + (data.message ?? ""));
        else toast.success("Import completed.");
        setRefresh((r) => r + 1);
      },
      (msg) => toast.error(msg)
    );
  };

  const handleFetchLatest = async () => {
    try {
      const result = await syncFinancialExchangeRatesApi();
      setRefresh((r) => r + 1);
      toast.success(`Fetched ${result.saved} saved rate(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to fetch latest rates.");
    }
  };

  const handleAddRate = async () => {
    try {
      await saveFinancialExchangeRateApi({
        date: addForm.date,
        from: addForm.from,
        to: addForm.to,
        rate: addForm.rate,
      });
      setRefresh((r) => r + 1);
      setAddOpen(false);
      setAddForm({
        date: today,
        from: "USD",
        to: settings.baseCurrency,
        rate: 1,
      });
      toast.success("Exchange rate saved.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "pair",
        header: "Pair",
        accessor: (r: FinancialExchangeRateRow) => (
          <span className="font-medium">{r.from} → {r.to}</span>
        ),
        sticky: true,
      },
      { id: "rate", header: "Rate", accessor: (r: FinancialExchangeRateRow) => r.rate },
      { id: "date", header: "Effective date", accessor: "date" as keyof FinancialExchangeRateRow },
      { id: "source", header: "Source", accessor: "source" as keyof FinancialExchangeRateRow },
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
              Sync daily rates
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onImportFile}
            />
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
                <SearchableSelect
                  value={from}
                  onValueChange={setFrom}
                  options={currencyOptions}
                  placeholder="Any"
                  searchPlaceholder="Search currency..."
                  emptyMessage="No currencies found."
                  className="w-44"
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <SearchableSelect
                  value={to}
                  onValueChange={setTo}
                  options={currencyOptions}
                  placeholder={settings.baseCurrency}
                  searchPlaceholder="Search currency..."
                  emptyMessage="No currencies found."
                  className="w-44"
                />
              </div>
            </div>
            <DataTable<FinancialExchangeRateRow>
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
              <SearchableSelect
                value={addForm.from}
                onValueChange={(v) => setAddForm((p) => ({ ...p, from: v }))}
                options={currencyOptions}
                placeholder="USD"
                searchPlaceholder="Search currency..."
                emptyMessage="No currencies found."
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <SearchableSelect
                value={addForm.to}
                onValueChange={(v) => setAddForm((p) => ({ ...p, to: v }))}
                options={currencyOptions}
                placeholder={settings.baseCurrency}
                searchPlaceholder="Search currency..."
                emptyMessage="No currencies found."
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
            <Button onClick={() => void handleAddRate()}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
