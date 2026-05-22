"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  autocompletePlacesApi,
  resolvePlaceDetailsApi,
  reverseGeocodeApi,
  type PlaceSuggestion,
  type ResolvedLocation,
} from "@/lib/api/places";
import * as Icons from "lucide-react";

type LocationPickerFieldProps = {
  label: string;
  required?: boolean;
  value: ResolvedLocation | null;
  onChange: (next: ResolvedLocation | null) => void;
  error?: string;
};

export function LocationPickerField({
  label,
  required = false,
  value,
  onChange,
  error,
}: LocationPickerFieldProps) {
  const sessionTokenRef = React.useRef(String(Date.now()));
  const [query, setQuery] = React.useState(value?.formattedAddress ?? "");
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQuery(value?.formattedAddress ?? "");
  }, [value?.formattedAddress]);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (value?.formattedAddress === query.trim()) return;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLocalError(null);
      try {
        const items = await autocompletePlacesApi(query, sessionTokenRef.current);
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Location search failed.");
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, value?.formattedAddress]);

  const selectSuggestion = async (item: PlaceSuggestion) => {
    setLoading(true);
    setOpen(false);
    setLocalError(null);
    try {
      const resolved = await resolvePlaceDetailsApi(item.placeId, sessionTokenRef.current);
      setQuery(resolved.formattedAddress);
      onChange(resolved);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not resolve location.");
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocalError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    setLocalError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resolved = await reverseGeocodeApi(pos.coords.latitude, pos.coords.longitude);
          setQuery(resolved.formattedAddress);
          onChange(resolved);
        } catch (err) {
          setLocalError(err instanceof Error ? err.message : "Could not resolve current location.");
        } finally {
          setLocating(false);
        }
      },
      (geoErr) => {
        setLocating(false);
        setLocalError(geoErr.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <div className="relative">
        <Input
          value={query}
          placeholder="Search location…"
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
        />
        {loading ? (
          <Icons.Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
        {open ? (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted/60 border-b last:border-b-0"
                onClick={() => void selectSuggestion(item)}
              >
                <div className="text-sm font-medium">{item.mainText ?? item.description}</div>
                {item.secondaryText ? (
                  <div className="text-xs text-muted-foreground">{item.secondaryText}</div>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating || loading}>
        {locating ? (
          <>
            <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Locating…
          </>
        ) : (
          <>
            <Icons.LocateFixed className="h-4 w-4 mr-2" />
            Use current location
          </>
        )}
      </Button>
      {value?.formattedAddress ? (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Icons.CheckCircle2 className="h-3 w-3" />
          {value.formattedAddress}
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && localError ? <p className="text-xs text-destructive">{localError}</p> : null}
    </div>
  );
}

export type { ResolvedLocation };
