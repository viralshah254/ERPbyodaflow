"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/money";
import type { RecentDoc } from "@/lib/types/dashboard";

const TYPE_LABELS: Record<string, string> = {
  "purchase-order": "Purchase order",
  "purchase-request": "Purchase request",
  "sales-order": "Sales order",
  "delivery-note": "Delivery",
  grn: "Goods receipt",
  invoice: "Invoice",
  bill: "Supplier bill",
  quote: "Quote",
  "credit-note": "Credit note",
  journal: "Journal",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/-/g, " ");
}

function updatedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface RecentDocumentsCardProps {
  items: RecentDoc[];
}

export function RecentDocumentsCard({ items }: RecentDocumentsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent documents</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/docs">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No recent documents.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {items.map((d) => (
              <Link
                key={d.id}
                href={`/docs/${d.type}/${d.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 sm:grid-cols-[9rem_minmax(0,1fr)_auto_auto_4.5rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{typeLabel(d.type)}</p>
                  <p className="truncate font-mono text-sm font-medium">{d.number}</p>
                </div>
                <StatusBadge status={d.status} className="sm:hidden" />
                <p className="col-span-2 truncate text-xs text-muted-foreground sm:hidden">
                  {d.party ?? "—"} · {formatMoney(d.total, "KES", { decimals: Number.isInteger(d.total) ? 0 : 2 })}
                </p>
                <p className="hidden truncate text-muted-foreground sm:block">{d.party ?? "—"}</p>
                <p className="hidden text-right font-medium tabular-nums sm:block">
                  {formatMoney(d.total, "KES", { decimals: Number.isInteger(d.total) ? 0 : 2 })}
                </p>
                <span className="hidden sm:block">
                  <StatusBadge status={d.status} />
                </span>
                <p className="hidden text-right text-xs text-muted-foreground sm:block">{updatedLabel(d.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
