"use client";

import Link from "next/link";
import { DocumentNumber } from "@/components/docs/document-number";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { cn } from "@/lib/utils";
import { Building2, Calendar, Hash, Wallet } from "lucide-react";

export type DocumentDetailHeaderField = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  href?: string;
};

export function DocumentDetailHeader({
  fields,
  className,
  compact = false,
}: {
  fields: DocumentDetailHeaderField[];
  className?: string;
  /** Tighter tiles for dense detail headers */
  compact?: boolean;
}) {
  const icons = [Hash, Calendar, Building2, Wallet];

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {fields.map((field, i) => {
        const Icon = icons[i % icons.length];
        const inner = (
          <div
            className={cn(
              "rounded-lg border bg-gradient-to-b from-card to-muted/20 shadow-sm transition-shadow hover:shadow-md",
              compact ? "p-3" : "rounded-xl p-4"
            )}
          >
            <div className={cn("flex items-center gap-2 text-muted-foreground", compact ? "mb-1" : "mb-2")}>
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{field.label}</span>
            </div>
            <div className={cn(compact ? "text-sm font-semibold" : "text-sm font-semibold", "text-foreground", field.mono && "font-mono")}>
              {field.value}
            </div>
          </div>
        );
        if (field.href) {
          return (
            <Link key={field.label} href={field.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
              {inner}
            </Link>
          );
        }
        return <div key={field.label}>{inner}</div>;
      })}
    </div>
  );
}

export function DocumentDetailHeaderSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className={cn("grid gap-3", columns === 5 ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-5 w-28 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** Number field with O/0-safe display */
export function DocumentNumberField({ number }: { number: string }) {
  return <DocumentNumber value={number} className="text-base" />;
}
