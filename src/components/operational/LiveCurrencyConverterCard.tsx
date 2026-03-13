"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchLiveExchangeRate } from "@/lib/fx/live-rates";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";

export function LiveCurrencyConverterCard() {
  const { settings } = useFinancialSettings();
  const availableCurrencies = React.useMemo(
    () => [...new Set([settings.baseCurrency, ...settings.enabledCurrencies, "UGX"])],
    [settings.baseCurrency, settings.enabledCurrencies]
  );
  const [amount, setAmount] = React.useState("100000");
  const [from, setFrom] = React.useState(settings.baseCurrency);
  const [to, setTo] = React.useState("UGX");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ rate: number; converted: number; fetchedAt: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFrom((current) => (availableCurrencies.includes(current) ? current : settings.baseCurrency));
    setTo((current) => (availableCurrencies.includes(current) ? current : settings.baseCurrency));
  }, [availableCurrencies, settings.baseCurrency]);

  const handleConvert = React.useCallback(async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rate = await fetchLiveExchangeRate(from, to);
      setResult({
        rate: rate.rate,
        converted: numericAmount * rate.rate,
        fetchedAt: rate.fetchedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to fetch live FX rate.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [amount, from, to]);

  React.useEffect(() => {
    void handleConvert();
  }, [handleConvert]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Currency Converter</CardTitle>
        <CardDescription>Uses saved backend FX rates, synced from the free ExchangeRate-API feed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input value={amount} type="number" min={0} step="0.01" onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => void handleConvert()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh live rate"}
          </Button>
          {result ? (
            <div className="text-sm text-muted-foreground">
              Rate: <span className="font-medium text-foreground">{result.rate.toFixed(4)}</span> ·
              Converted: <span className="font-medium text-foreground"> {result.converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}</span>
            </div>
          ) : null}
        </div>
        {result ? (
          <div className="text-xs text-muted-foreground">
            Last fetched: {new Date(result.fetchedAt).toLocaleString()}
          </div>
        ) : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
      </CardContent>
    </Card>
  );
}

