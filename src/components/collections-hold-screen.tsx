"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import {
  formatKes,
  parseCollectionsHold,
  type CollectionsHold,
} from "@/lib/api/collections-hold";

function HoldBody({ hold }: { hold: CollectionsHold }) {
  if (!hold.canViewBalance) {
    return (
      <p className="text-base leading-relaxed text-slate-200">
        {hold.message || "Access to the ERP is suspended. Contact HQ."}
      </p>
    );
  }

  const principal = hold.principal ?? 504000;
  const interest = hold.interestAccrued ?? 0;
  const total = hold.totalDue ?? principal + interest;
  const ratePct = ((hold.monthlyRate ?? 0.015) * 100).toFixed(1);

  return (
    <div className="space-y-5">
      <p className="text-2xl font-semibold tracking-tight text-white">
        {hold.outstandingHeadline || `Your Outstanding is Ksh ${principal.toLocaleString("en-KE")}`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Interest accrued ({ratePct}% / month)</p>
          <p className="mt-1 font-mono text-lg text-amber-200">{formatKes(interest)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total due</p>
          <p className="mt-1 font-mono text-lg text-white">{formatKes(total)}</p>
        </div>
      </div>
      {hold.asOf ? (
        <p className="text-xs text-slate-500">Live as of {hold.asOf} (Africa/Nairobi)</p>
      ) : null}
      <p className="text-sm leading-relaxed text-slate-300">
        {hold.interestNote ||
          "This amount will keep accruing interest until the day you clear our balance. This is a live amount checker for you to review."}
      </p>
      <p className="text-sm font-medium text-slate-100">
        {hold.contractNote || "Please refer to the contract for further information."}
      </p>
    </div>
  );
}

export function CollectionsHoldScreen({ initial }: { initial: CollectionsHold | null }) {
  const [hold, setHold] = useState<CollectionsHold | null>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await apiRequest<{ collectionsHold?: unknown }>("/api/collections-hold");
        const next = parseCollectionsHold(data.collectionsHold);
        if (!cancelled && next) setHold(next);
      } catch {
        /* stay on last known */
      }
    };
    const id = window.setInterval(() => void tick(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const shown: CollectionsHold = hold ?? {
    enabled: true,
    canViewBalance: false,
    message: "Access to the ERP is suspended. Contact HQ.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001A3D] px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B2A55] p-8 shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Account notice</p>
        <HoldBody hold={shown} />
      </div>
    </div>
  );
}
