"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DEFAULT_PHONE_DIAL = "+254";

const CURATED_DIALS = [
  { value: "+254", label: "Kenya (+254)" },
  { value: "+256", label: "Uganda (+256)" },
  { value: "+255", label: "Tanzania (+255)" },
  { value: "+250", label: "Rwanda (+250)" },
  { value: "+27", label: "South Africa (+27)" },
  { value: "+1", label: "US/Canada (+1)" },
] as const;

const OTHER_DIAL_VALUE = "__other__";

/** Strip to digits only. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normalize dial to +digits form. */
export function normalizeDial(dial: string): string {
  const d = dial.trim();
  if (!d) return DEFAULT_PHONE_DIAL;
  const digits = digitsOnly(d);
  return digits ? `+${digits}` : DEFAULT_PHONE_DIAL;
}

/** Parse stored full phone into dial + local parts. */
export function parsePhoneNumber(full: string | null | undefined): {
  dial: string;
  local: string;
  dialSelectValue: string;
} {
  const trimmed = (full ?? "").trim();
  if (!trimmed) {
    return { dial: DEFAULT_PHONE_DIAL, local: "", dialSelectValue: DEFAULT_PHONE_DIAL };
  }

  const normalized = trimmed.startsWith("+") ? trimmed : `+${digitsOnly(trimmed)}`;
  const allDigits = digitsOnly(normalized);
  if (!allDigits) {
    return { dial: DEFAULT_PHONE_DIAL, local: "", dialSelectValue: DEFAULT_PHONE_DIAL };
  }

  const known = [...CURATED_DIALS]
    .map((c) => c.value)
    .sort((a, b) => b.length - a.length);
  for (const dial of known) {
    const dialDigits = digitsOnly(dial);
    if (allDigits.startsWith(dialDigits)) {
      const localDigits = allDigits.slice(dialDigits.length);
      return {
        dial,
        local: localDigits,
        dialSelectValue: dial,
      };
    }
  }

  if (normalized.startsWith("+")) {
    const match = normalized.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      const dial = match[1];
      const local = digitsOnly(match[2] ?? "");
      const curated = CURATED_DIALS.find((c) => c.value === dial);
      return {
        dial,
        local,
        dialSelectValue: curated ? dial : OTHER_DIAL_VALUE,
      };
    }
  }

  return {
    dial: DEFAULT_PHONE_DIAL,
    local: allDigits,
    dialSelectValue: DEFAULT_PHONE_DIAL,
  };
}

/** Combine dial + local into E.164-style storage string. */
export function formatPhoneNumber(dial: string, local: string): string {
  const dialNorm = normalizeDial(dial);
  const localDigits = digitsOnly(local);
  if (!localDigits) return "";
  const dialDigits = digitsOnly(dialNorm);
  return `+${dialDigits}${localDigits}`;
}

export type PhoneWithCountryCodeProps = {
  value: string;
  onChange: (full: string) => void;
  id?: string;
  localPlaceholder?: string;
  disabled?: boolean;
  className?: string;
};

export function PhoneWithCountryCode({
  value,
  onChange,
  id,
  localPlaceholder = "712 345 678",
  disabled,
  className,
}: PhoneWithCountryCodeProps) {
  const parsed = React.useMemo(() => parsePhoneNumber(value), [value]);
  const [dialSelect, setDialSelect] = React.useState(parsed.dialSelectValue);
  const [customDial, setCustomDial] = React.useState(
    parsed.dialSelectValue === OTHER_DIAL_VALUE ? parsed.dial : DEFAULT_PHONE_DIAL
  );
  const [local, setLocal] = React.useState(parsed.local);

  React.useEffect(() => {
    setDialSelect(parsed.dialSelectValue);
    setCustomDial(parsed.dialSelectValue === OTHER_DIAL_VALUE ? parsed.dial : DEFAULT_PHONE_DIAL);
    setLocal(parsed.local);
  }, [parsed.dial, parsed.dialSelectValue, parsed.local, value]);

  const effectiveDial =
    dialSelect === OTHER_DIAL_VALUE ? normalizeDial(customDial) : normalizeDial(dialSelect);

  const emitChange = React.useCallback(
    (nextDial: string, nextLocal: string) => {
      onChange(formatPhoneNumber(nextDial, nextLocal));
    },
    [onChange]
  );

  return (
    <div className={className ?? "flex gap-2"}>
      <Select
        value={dialSelect}
        onValueChange={(next) => {
          setDialSelect(next);
          const dial = next === OTHER_DIAL_VALUE ? normalizeDial(customDial) : normalizeDial(next);
          emitChange(dial, local);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px] shrink-0" aria-label="Country code">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURATED_DIALS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_DIAL_VALUE}>Other…</SelectItem>
        </SelectContent>
      </Select>
      {dialSelect === OTHER_DIAL_VALUE ? (
        <Input
          className="w-24 shrink-0 font-mono text-sm"
          value={customDial}
          onChange={(e) => {
            const next = e.target.value;
            setCustomDial(next);
            emitChange(normalizeDial(next), local);
          }}
          placeholder="+XXX"
          disabled={disabled}
          aria-label="Custom country code"
        />
      ) : null}
      <Input
        id={id}
        type="tel"
        className="flex-1"
        value={local}
        onChange={(e) => {
          const next = e.target.value;
          setLocal(next);
          emitChange(effectiveDial, next);
        }}
        placeholder={localPlaceholder}
        disabled={disabled}
        aria-label="Phone number"
      />
    </div>
  );
}
