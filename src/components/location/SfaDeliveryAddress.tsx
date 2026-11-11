"use client";

import { useEffect, useState, type ReactNode } from "react";
import { reverseGeocodeApi, type ResolvedLocation } from "@/lib/api/places";

export function parseSfaDeliveryPin(address?: string | null) {
  // SFA can emit a leading comma when the location has no street text.
  const match = address?.trim().match(/^,?\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function PinAddress({ latitude, longitude }: NonNullable<ReturnType<typeof parseSfaDeliveryPin>>) {
  const [location, setLocation] = useState<ResolvedLocation | null>();
  useEffect(() => {
    let active = true;
    reverseGeocodeApi(latitude, longitude).then(
      (result) => {
        if (active) setLocation(result.formattedAddress?.trim() ? result : null);
      },
      () => {
        if (active) setLocation(null);
      },
    );
    return () => { active = false; };
  }, [latitude, longitude]);

  const pin = `${latitude},${longitude}`;
  return (
    <div className="space-y-1">
      <div aria-live="polite">
        <p className="text-sm font-medium">
          {location?.formattedAddress ?? (location === undefined ? "Looking up the delivery address…" : "Street address unavailable")}
        </p>
        {location?.provider === "google" && <p className="text-xs text-muted-foreground">Google Maps</p>}
        {location?.provider === "osm" && (
          <a className="text-xs text-muted-foreground underline" href="https://www.openstreetmap.org/copyright">
            © OpenStreetMap contributors
          </a>
        )}
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline underline-offset-2"
      >
        Open original pin in Google Maps
      </a>
    </div>
  );
}

export function SfaDeliveryAddress({
  address,
  isSfaOrder,
  editable,
  children,
}: {
  address?: string | null;
  isSfaOrder: boolean;
  editable: boolean;
  children: ReactNode;
}) {
  const pin = isSfaOrder ? parseSfaDeliveryPin(address) : null;
  if (!pin) return <>{children}</>;

  return (
    <>
      <PinAddress key={`${pin.latitude},${pin.longitude}`} {...pin} />
      {editable && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">Edit delivery address</summary>
          {children}
        </details>
      )}
    </>
  );
}
