"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyKraPinApi, KRA_ITAX_PIN_CHECKER_URL, type KraPinVerifyResult } from "@/lib/api/kra";
import { cn } from "@/lib/utils";

const KRA_PIN_PATTERN = /^[AP][0-9]{9}[A-Z]$/i;

type VerifyState = "idle" | "checking" | "valid" | "invalid" | "unavailable";

type KraTaxPinFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  optional?: boolean;
  className?: string;
  onClearError?: () => void;
  error?: string;
};

export function KraTaxPinField({
  value,
  onChange,
  label = "Tax PIN (KRA)",
  placeholder = "e.g. P051234567X",
  optional = true,
  className,
  onClearError,
  error,
}: KraTaxPinFieldProps) {
  const [verifyState, setVerifyState] = React.useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = React.useState<string | undefined>(undefined);
  const [verifyDetails, setVerifyDetails] = React.useState<KraPinVerifyResult | null>(null);
  const [fallbackUrl, setFallbackUrl] = React.useState(KRA_ITAX_PIN_CHECKER_URL);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      setVerifyState("idle");
      setVerifyMessage(undefined);
      setVerifyDetails(null);
      return;
    }

    if (!KRA_PIN_PATTERN.test(normalized)) {
      setVerifyState("idle");
      setVerifyMessage(undefined);
      setVerifyDetails(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setVerifyState("checking");
    setVerifyMessage("Checking with KRA…");

    const timer = window.setTimeout(() => {
      void verifyKraPinApi(normalized)
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setVerifyDetails(result);
          setFallbackUrl(result.fallbackUrl || KRA_ITAX_PIN_CHECKER_URL);

          if (!result.available) {
            setVerifyState("unavailable");
            setVerifyMessage(result.message ?? "Automatic verification is not available.");
            return;
          }

          if (result.valid) {
            setVerifyState("valid");
            const name = result.taxpayerName?.trim();
            const status = result.pinStatus?.trim();
            setVerifyMessage(
              [name, status ? `Status: ${status}` : undefined, result.taxpayerType]
                .filter(Boolean)
                .join(" · "),
            );
            return;
          }

          setVerifyState("invalid");
          setVerifyMessage(result.message ?? "PIN not found or inactive.");
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setVerifyState("unavailable");
          setVerifyMessage("Could not reach KRA verification. Use the official PIN checker.");
          setVerifyDetails(null);
        });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [value]);

  const showFallbackLink = verifyState === "unavailable" || verifyState === "invalid";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}
          {!optional ? <span className="text-destructive"> *</span> : null}
        </Label>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Icons.ExternalLink className="h-3 w-3" />
          KRA PIN checker
        </a>
      </div>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onClearError?.();
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            verifyState === "valid" && "border-emerald-500/70 focus-visible:ring-emerald-500/30",
            verifyState === "invalid" && "border-destructive/70 focus-visible:ring-destructive/30",
          )}
        />
        {verifyState === "checking" ? (
          <Icons.Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
        {verifyState === "valid" ? (
          <Icons.CircleCheck className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
        ) : null}
        {verifyState === "invalid" ? (
          <Icons.CircleX className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {verifyMessage ? (
        <p
          className={cn(
            "text-xs",
            verifyState === "valid" && "text-emerald-700 dark:text-emerald-400",
            verifyState === "invalid" && "text-destructive",
            verifyState === "unavailable" && "text-amber-700 dark:text-amber-400",
            verifyState === "checking" && "text-muted-foreground",
          )}
        >
          {verifyMessage}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter a valid KRA PIN to verify taxpayer details automatically.
        </p>
      )}
      {showFallbackLink ? (
        <p className="text-xs text-muted-foreground">
          Verify manually on the{" "}
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            official KRA iTax PIN Checker
          </a>
          {verifyDetails?.available === false ? " while API access is pending approval." : "."}
        </p>
      ) : null}
    </div>
  );
}
