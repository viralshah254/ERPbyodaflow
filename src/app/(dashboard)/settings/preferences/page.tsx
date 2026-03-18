"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_LIST } from "@/lib/data/currencies";
import { TIMEZONE_LIST } from "@/lib/data/timezones";
import { DATE_FORMAT_LIST } from "@/lib/data/date-formats";
import { fetchPreferencesApi, updatePreferencesApi, type Preferences } from "@/lib/api/preferences";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const DEFAULT_PREFS: Preferences = {
  currency: "KES",
  timeZone: "Africa/Nairobi",
  dateFormat: "DD/MM/YYYY",
};

export default function PreferencesPage() {
  const [prefs, setPrefs] = React.useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchPreferencesApi()
      .then((data) => {
        if (!cancelled) setPrefs((p) => ({ ...p, ...data }));
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load preferences.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currencyOptions = React.useMemo(() => {
    const codes = new Set(CURRENCY_LIST.map((c) => c.code));
    const current = prefs.currency ?? "KES";
    if (current && !codes.has(current)) {
      return [{ code: current, name: current, symbol: current }, ...CURRENCY_LIST];
    }
    return CURRENCY_LIST;
  }, [prefs.currency]);

  const timezoneOptions = React.useMemo(() => {
    const values = new Set(TIMEZONE_LIST.map((t) => t.value));
    const current = prefs.timeZone ?? "Africa/Nairobi";
    if (current && !values.has(current)) {
      return [{ value: current, label: current }, ...TIMEZONE_LIST];
    }
    return TIMEZONE_LIST;
  }, [prefs.timeZone]);

  const dateFormatOptions = React.useMemo(() => {
    const values = new Set(DATE_FORMAT_LIST.map((f) => f.value));
    const current = prefs.dateFormat ?? "DD/MM/YYYY";
    if (current && !values.has(current)) {
      return [{ value: current, label: current, example: current }, ...DATE_FORMAT_LIST];
    }
    return DATE_FORMAT_LIST;
  }, [prefs.dateFormat]);

  const handleSave = async () => {
    if (!isApiConfigured()) {
      toast.error("Set NEXT_PUBLIC_API_URL to save preferences.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePreferencesApi({
        currency: prefs.currency,
        timeZone: prefs.timeZone,
        dateFormat: prefs.dateFormat,
      });
      setPrefs((p) => ({ ...p, ...updated }));
      toast.success("Preferences saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Preferences"
      description="Configure organization preferences"
    >
      <Card>
        <CardHeader>
          <CardTitle>Organization Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={prefs.currency ?? "KES"}
              onValueChange={(v) => setPrefs((p) => ({ ...p, currency: v }))}
              disabled={loading}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={prefs.timeZone ?? "Africa/Nairobi"}
              onValueChange={(v) => setPrefs((p) => ({ ...p, timeZone: v }))}
              disabled={loading}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select
              value={prefs.dateFormat ?? "DD/MM/YYYY"}
              onValueChange={(v) => setPrefs((p) => ({ ...p, dateFormat: v }))}
              disabled={loading}
            >
              <SelectTrigger id="date-format">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                {dateFormatOptions.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label} — {f.example}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Icons.Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
