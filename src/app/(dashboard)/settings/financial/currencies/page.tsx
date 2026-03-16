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
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { CURRENCY_LIST, getCurrencyByCode } from "@/lib/data/currencies";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import type { CurrencyCode } from "@/lib/org/financial-settings";
import { BaseCurrencyCard } from "@/components/settings/financial/BaseCurrencyCard";
import { CurrencyTable } from "@/components/settings/financial/CurrencyTable";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import {
  createFinancialCurrencyApi,
  fetchFinancialCurrenciesApi,
  fetchSupportedCurrenciesApi,
  type FinancialCurrencyRow,
} from "@/lib/api/financial-settings";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type SupportedCurrency = { code: string; name: string; symbol?: string };

export default function CurrenciesSettingsPage() {
  const { settings, update } = useFinancialSettings();
  const [addOpen, setAddOpen] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = React.useState("");
  const [newCurrencyCode, setNewCurrencyCode] = React.useState("");
  const [newCurrencyName, setNewCurrencyName] = React.useState("");
  const [newCurrencySymbol, setNewCurrencySymbol] = React.useState("");
  const [currencies, setCurrencies] = React.useState<FinancialCurrencyRow[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = React.useState<SupportedCurrency[]>(CURRENCY_LIST);

  React.useEffect(() => {
    if (!addOpen || !isApiConfigured()) return;
    fetchSupportedCurrenciesApi()
      .then((res) => {
        setSupportedCurrencies(res.fromApi ? res.items.map((c) => ({ code: c.code, name: c.name })) : CURRENCY_LIST);
      })
      .catch(() => setSupportedCurrencies(CURRENCY_LIST));
  }, [addOpen]);

  const currencySelectOptions: SearchableSelectOption[] = React.useMemo(() => {
    const enabledSet = new Set(settings.enabledCurrencies);
    return supportedCurrencies
      .filter((c) => !enabledSet.has(c.code as CurrencyCode))
      .map((c) => ({ id: c.code, label: `${c.code} - ${c.name}` }));
  }, [settings.enabledCurrencies, supportedCurrencies]);

  const onCurrencySelect = React.useCallback((code: string) => {
    setSelectedCurrencyCode(code);
    const fromApi = supportedCurrencies.find((c) => c.code === code);
    const fromStatic = getCurrencyByCode(code);
    const c = fromStatic ?? fromApi;
    if (c) {
      setNewCurrencyCode(c.code);
      setNewCurrencyName(c.name);
      setNewCurrencySymbol("symbol" in c && c.symbol ? c.symbol : "");
    }
  }, [supportedCurrencies]);

  const resetAddForm = React.useCallback(() => {
    setSelectedCurrencyCode("");
    setNewCurrencyCode("");
    setNewCurrencyName("");
    setNewCurrencySymbol("");
  }, []);

  const loadCurrencies = React.useCallback(async () => {
    try {
      setCurrencies(await fetchFinancialCurrenciesApi());
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, []);

  React.useEffect(() => {
    void loadCurrencies();
  }, [loadCurrencies]);

  const handleBaseChange = React.useCallback(
    async (code: CurrencyCode) => {
      try {
        const next = [...new Set([...settings.enabledCurrencies, code])];
        await update({ baseCurrency: code, enabledCurrencies: next });
        await loadCurrencies();
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
    [settings.enabledCurrencies, update, loadCurrencies]
  );

  const handleToggle = React.useCallback(
    async (code: string, enabled: boolean) => {
      if (!enabled && settings.baseCurrency === code) return;
      try {
        const next = enabled
          ? [...new Set([...settings.enabledCurrencies, code])]
          : settings.enabledCurrencies.filter((c) => c !== code);
        await update({ enabledCurrencies: next });
        await loadCurrencies();
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
    [settings.baseCurrency, settings.enabledCurrencies, update, loadCurrencies]
  );

  const handleAddCurrency = () => {
    setAddOpen(true);
  };

  const handleAddSave = () => {
    const code = newCurrencyCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a currency code.");
      return;
    }
    createFinancialCurrencyApi({
      code,
      name: newCurrencyName.trim() || undefined,
      symbol: newCurrencySymbol.trim() || undefined,
    })
      .then(async () => {
        const next = [...new Set([...settings.enabledCurrencies, code as CurrencyCode])];
        await update({ enabledCurrencies: next });
        await loadCurrencies();
        toast.success(`Currency ${code} enabled.`);
        setAddOpen(false);
        resetAddForm();
      })
      .catch((error) => toast.error((error as Error).message));
  };

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
      "/api/import/currencies",
      file,
      (data) => {
        if (data.imported != null) toast.success(`Imported ${data.imported} currency(ies).`);
        else if (data.jobId) toast.success("Import queued. " + (data.message ?? ""));
        else toast.success("Import completed.");
      },
      (msg) => toast.error(msg)
    );
  };

  return (
    <PageShell>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onImportFile}
      />
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
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `currencies-${new Date().toISOString().slice(0, 10)}.csv`,
                  settings.enabledCurrencies.map((code) => ({
                    code,
                    isBaseCurrency: code === settings.baseCurrency,
                  }))
                )
              }
            >
              <Icons.Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportCsv}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <BaseCurrencyCard
          value={settings.baseCurrency}
          onChange={handleBaseChange}
          currencies={currencies}
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
              currencies={currencies}
              onToggle={handleToggle}
              onAddCurrency={handleAddCurrency}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add currency</SheetTitle>
            <SheetDescription>
              Enable an additional currency code for transactions and reporting.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <SearchableSelect
                value={selectedCurrencyCode}
                onValueChange={onCurrencySelect}
                options={currencySelectOptions}
                placeholder="Search by code or name..."
                searchPlaceholder="Search by code or name..."
                emptyMessage="No currencies found or already enabled."
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="e.g. CHF"
                value={newCurrencyCode}
                onChange={(e) => setNewCurrencyCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Swiss Franc"
                value={newCurrencyName}
                onChange={(e) => setNewCurrencyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input
                placeholder="e.g. CHF"
                value={newCurrencySymbol}
                onChange={(e) => setNewCurrencySymbol(e.target.value)}
              />
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
            <Button onClick={handleAddSave}>Add currency</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
