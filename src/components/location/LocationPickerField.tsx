"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

type LocationPickerFieldProps = {
  label?: string;
  required?: boolean;
  optional?: boolean;
  value: ResolvedLocation | null;
  onChange: (next: ResolvedLocation | null) => void;
  error?: string;
  placeholder?: string;
  /** Start with coordinates panel open. Default collapsed. */
  coordsOpenDefault?: boolean;
};

export function LocationPickerField({
  label = "Address",
  required = false,
  optional = !required,
  value,
  onChange,
  error,
  placeholder = "Search address or type manually…",
  coordsOpenDefault = false,
}: LocationPickerFieldProps) {
  const sessionTokenRef = React.useRef(String(Date.now()));
  const [query, setQuery] = React.useState(value?.formattedAddress ?? value?.line1 ?? "");
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [listOpen, setListOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [providerHint, setProviderHint] = React.useState<string | null>(null);
  const [coordsOpen, setCoordsOpen] = React.useState(coordsOpenDefault);
  const [latText, setLatText] = React.useState(
    value?.latitude != null && Number.isFinite(value.latitude) ? String(value.latitude) : ""
  );
  const [lngText, setLngText] = React.useState(
    value?.longitude != null && Number.isFinite(value.longitude) ? String(value.longitude) : ""
  );
  const skipSuggestRef = React.useRef(false);
  const inputWrapRef = React.useRef<HTMLDivElement>(null);
  const [menuBox, setMenuBox] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateMenuBox = React.useCallback(() => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  React.useEffect(() => {
    if (!listOpen) return;
    updateMenuBox();
    const onReposition = () => updateMenuBox();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [listOpen, suggestions.length, updateMenuBox]);

  React.useEffect(() => {
    setQuery(value?.formattedAddress ?? value?.line1 ?? "");
    setLatText(
      value?.latitude != null && Number.isFinite(value.latitude) ? String(value.latitude) : ""
    );
    setLngText(
      value?.longitude != null && Number.isFinite(value.longitude) ? String(value.longitude) : ""
    );
  }, [value?.formattedAddress, value?.line1, value?.latitude, value?.longitude]);

  React.useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setListOpen(false);
      return;
    }
    // Only skip when the query still matches a resolved place pick (not manual typing).
    if (
      value?.placeId &&
      (value.formattedAddress?.trim() === q || value.line1?.trim() === q)
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLocalError(null);
      try {
        const items = await autocompletePlacesApi(query, sessionTokenRef.current);
        setSuggestions(items);
        setListOpen(items.length > 0);
        const provider = items[0]?.provider;
        if (provider === "osm") {
          setProviderHint("Suggestions via OpenStreetMap (Google unavailable)");
        } else if (provider === "google") {
          setProviderHint(null);
        }
      } catch (err) {
        setLocalError(
          err instanceof Error
            ? `${err.message}. You can still type the address manually.`
            : "Location search failed. Type the address manually."
        );
        setSuggestions([]);
        setListOpen(false);
        setProviderHint(null);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, value?.placeId, value?.formattedAddress, value?.line1]);

  const commitManual = (text: string, lat?: string, lng?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !lat?.trim() && !lng?.trim()) {
      onChange(null);
      return;
    }
    const latitude = lat?.trim() ? Number(lat) : undefined;
    const longitude = lng?.trim() ? Number(lng) : undefined;
    // Editing text clears a previous place pick so autocomplete can run again.
    onChange({
      formattedAddress: trimmed,
      line1: trimmed || undefined,
      latitude: latitude != null && Number.isFinite(latitude) ? latitude : undefined,
      longitude: longitude != null && Number.isFinite(longitude) ? longitude : undefined,
    });
  };

  const selectSuggestion = async (item: PlaceSuggestion) => {
    setLoading(true);
    setListOpen(false);
    setLocalError(null);
    try {
      const resolved = await resolvePlaceDetailsApi(item.placeId, sessionTokenRef.current);
      skipSuggestRef.current = true;
      setQuery(resolved.formattedAddress);
      setLatText(
        resolved.latitude != null && Number.isFinite(resolved.latitude)
          ? String(resolved.latitude)
          : ""
      );
      setLngText(
        resolved.longitude != null && Number.isFinite(resolved.longitude)
          ? String(resolved.longitude)
          : ""
      );
      onChange(resolved);
      if (resolved.provider === "osm") {
        setProviderHint("Location from OpenStreetMap");
      } else {
        setProviderHint(null);
      }
      sessionTokenRef.current = String(Date.now());
    } catch (err) {
      // Details failed — keep suggestion text as manual address
      skipSuggestRef.current = true;
      setQuery(item.description);
      onChange({
        formattedAddress: item.description,
        line1: item.description,
        placeId: item.placeId,
        provider: item.provider,
      });
      setLocalError(
        err instanceof Error
          ? `${err.message}. Address saved as text — add coordinates if you have them.`
          : "Could not resolve place details. Address saved as text."
      );
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
          skipSuggestRef.current = true;
          setQuery(resolved.formattedAddress);
          setLatText(String(pos.coords.latitude));
          setLngText(String(pos.coords.longitude));
          onChange({
            ...resolved,
            latitude: resolved.latitude ?? pos.coords.latitude,
            longitude: resolved.longitude ?? pos.coords.longitude,
          });
          setCoordsOpen(true);
        } catch {
          // Reverse geocode failed — still store coordinates
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          skipSuggestRef.current = true;
          setLatText(String(lat));
          setLngText(String(lng));
          setCoordsOpen(true);
          onChange({
            formattedAddress: query.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            line1: query.trim() || undefined,
            latitude: lat,
            longitude: lng,
          });
          setLocalError("Could not resolve address from GPS. Coordinates saved — type address if needed.");
        } finally {
          setLocating(false);
        }
      },
      (geoErr) => {
        setLocating(false);
        setLocalError(geoErr.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-2">
      <Label className="flex flex-wrap items-baseline gap-1.5">
        <span>{label}</span>
        {required ? <span className="text-xs font-medium text-destructive">Required</span> : null}
        {optional ? <span className="text-xs font-normal text-muted-foreground">Optional</span> : null}
      </Label>
      <div className="relative" ref={inputWrapRef}>
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            commitManual(next, latText, lngText);
          }}
          onFocus={() => {
            updateMenuBox();
            if (suggestions.length > 0) setListOpen(true);
          }}
          onBlur={() => {
            // Portaled menu is outside the input; give pointerDown time to select.
            window.setTimeout(() => setListOpen(false), 250);
          }}
        />
        {loading ? (
          <Icons.Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
        {listOpen && suggestions.length > 0 && menuBox && typeof document !== "undefined"
          ? createPortal(
              <div
                data-location-suggestions=""
                className="fixed z-[300] rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto pointer-events-auto"
                style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {suggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted/60 border-b last:border-b-0 cursor-pointer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void selectSuggestion(item);
                    }}
                  >
                    <div className="text-sm font-medium">
                      {item.mainText ?? item.description}
                    </div>
                    {item.secondaryText ? (
                      <div className="text-xs text-muted-foreground">{item.secondaryText}</div>
                    ) : null}
                  </button>
                ))}
              </div>,
              document.body
            )
          : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useCurrentLocation}
          disabled={locating || loading}
        >
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCoordsOpen((v) => !v)}
          className="text-muted-foreground"
        >
          <Icons.MapPin className="h-4 w-4 mr-1.5" />
          Coordinates
          {coordsOpen ? (
            <Icons.ChevronUp className="h-3.5 w-3.5 ml-1" />
          ) : (
            <Icons.ChevronDown className="h-3.5 w-3.5 ml-1" />
          )}
        </Button>
      </div>

      {coordsOpen ? (
        <div className={cn("grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3")}>
          <div className="space-y-1.5">
            <Label htmlFor="loc-lat" className="text-xs text-muted-foreground">
              Latitude · Optional
            </Label>
            <Input
              id="loc-lat"
              value={latText}
              placeholder="-1.2921"
              onChange={(e) => {
                setLatText(e.target.value);
                commitManual(query, e.target.value, lngText);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-lng" className="text-xs text-muted-foreground">
              Longitude · Optional
            </Label>
            <Input
              id="loc-lng"
              value={lngText}
              placeholder="36.8219"
              onChange={(e) => {
                setLngText(e.target.value);
                commitManual(query, latText, e.target.value);
              }}
            />
          </div>
        </div>
      ) : null}

      {value?.placeId || (value?.latitude != null && value?.longitude != null) ? (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <Icons.CheckCircle2 className="h-3 w-3 shrink-0" />
          {value.placeId
            ? `Place saved${value.provider === "osm" ? " (OpenStreetMap)" : ""}`
            : "Coordinates saved"}
          {value.latitude != null && value.longitude != null
            ? ` · ${Number(value.latitude).toFixed(5)}, ${Number(value.longitude).toFixed(5)}`
            : ""}
        </p>
      ) : null}
      {providerHint ? <p className="text-xs text-muted-foreground">{providerHint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && localError ? <p className="text-xs text-destructive">{localError}</p> : null}
    </div>
  );
}

export type { ResolvedLocation };
