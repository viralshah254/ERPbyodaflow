"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { TUTORIAL_REVISION } from "@/lib/tutorial/knowledge";
import { resolveScreenGuide } from "@/lib/tutorial/screen-guides";

export function GuideLearningSummary({ allowedHrefs }: { allowedHrefs: string[] }) {
  const userId = useAuthStore(s => s.user?.userId);
  const orgId = useAuthStore(s => s.org?.orgId);
  const [recent, setRecent] = React.useState<Array<{ href: string; title: string; updatedAt: number }>>([]);
  React.useEffect(() => {
    const prefix = `erp-page-guide:v2:${userId ?? "local"}:${orgId ?? "local"}:${TUTORIAL_REVISION}:`;
    const bomPrefix = `erp-bom-guide:v1:${userId ?? "local"}:${orgId ?? "local"}:`;
    const rows: Array<{ href: string; title: string; updatedAt: number }> = [];
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key || !(key.startsWith(prefix) && key.endsWith(":page") || key.startsWith(bomPrefix))) continue;
        const value = JSON.parse(localStorage.getItem(key) ?? "null");
        if (value?.status !== "in-progress" || typeof value.href !== "string" || !resolveScreenGuide(value.href)) continue;
        if (!allowedHrefs.some(href => value.href === href || value.href.startsWith(`${href}/`))) continue;
        rows.push({ href: value.href, title: resolveScreenGuide(value.href)!.title, updatedAt: Number(value.updatedAt) || 0 });
      }
    } catch { /* Browser progress is optional. */ }
    setRecent(rows.sort((a,b) => b.updatedAt-a.updatedAt).slice(0,3));
  }, [userId, orgId, allowedHrefs]);
  if (!recent.length) return null;
  return <section className="rounded-xl border bg-card p-5" aria-label="Continue learning">
    <h2 className="flex items-center gap-2 text-base font-semibold"><RotateCcw className="h-4 w-4 text-primary" />Continue learning</h2>
    <p className="mt-1 text-sm text-muted-foreground">Resume your saved walkthroughs in this browser.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-3">{recent.map(item => <Link key={item.href} href={`${item.href}?learn=1`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:border-primary"><span>{item.title}</span><ArrowRight className="h-4 w-4 shrink-0" /></Link>)}</div>
  </section>;
}
