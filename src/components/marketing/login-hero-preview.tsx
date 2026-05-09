"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import { OdaLogo } from "@/components/brand/OdaLogo";
import { ODA_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Decorative product preview beside the login form (not interactive).
 */
export function LoginHeroPreview() {
  return (
    <div
      className="relative flex min-h-[520px] flex-col overflow-hidden text-white lg:min-h-[560px]"
      style={{
        background: `linear-gradient(155deg, ${ODA_BRAND.navy} 0%, #062a52 52%, ${ODA_BRAND.navy} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="pointer-events-none absolute -right-28 -top-28 h-[22rem] w-[22rem] rounded-full bg-[#1e88e5]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-[18rem] w-[18rem] rounded-full bg-cyan-400/12 blur-3xl" />

      <div className="relative z-[1] flex flex-1 flex-col p-7 sm:p-9">
        <div className="mb-8">
          <OdaLogo height={44} />
          <p className="mt-4 max-w-[20rem] text-[15px] leading-relaxed text-white/88">
            Your operations hub—stock, outlets, invoicing (KES), and approvals in one dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Inventory live",
              "POS & franchises",
              "VAT-ready docs",
            ].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/85"
              >
                <Sparkles className="h-3 w-3 text-sky-300/90" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Faux dashboard shell */}
        <div className="mt-auto rounded-xl border border-white/12 bg-black/25 p-4 shadow-inner backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e88e5]/35">
                <LayoutDashboard className="h-4 w-4 text-sky-200" aria-hidden />
              </div>
              <div>
                <div className="text-[13px] font-semibold tracking-tight">Overview</div>
                <div className="text-[10px] text-white/50">Demo layout</div>
              </div>
            </div>
            <span className="rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/95">
              Live sync
            </span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <PreviewStat icon={TrendingUp} label="Sales (30d)" value="KES 2.4M" delta="+12%" tone="positive" />
            <PreviewStat icon={Package} label="SKUs tracked" value="842" tone="neutral" />
            <PreviewStat icon={Truck} label="Fulfillment" value="94%" tone="neutral" />
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Recent activity
            </div>
            <PreviewRow icon={Receipt} title="INV-2048 · Nairobi outlet" subtitle="Posted · Wholesale" trailing="KES 18,420" />
            <PreviewRow icon={Package} title="Stock transfer · Warehouse A" subtitle="Approved" trailing="Qty 240" muted />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  tone: "positive" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2">
      <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-white/45">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </div>
      <div className="truncate text-[13px] font-bold tabular-nums tracking-tight">{value}</div>
      {delta && tone === "positive" ? (
        <div className="mt-0.5 text-[9px] font-medium text-emerald-300">{delta}</div>
      ) : null}
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  trailing: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-2.5 py-2",
        muted
          ? "border-white/[0.06] bg-black/15 opacity-85"
          : "border-[#1e88e5]/25 bg-[#1e88e5]/[0.07]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/8">
          <Icon className="h-3.5 w-3.5 text-sky-200/90" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium leading-snug">{title}</div>
          <div className="text-[10px] text-white/45">{subtitle}</div>
        </div>
      </div>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/80">{trailing}</span>
    </div>
  );
}
