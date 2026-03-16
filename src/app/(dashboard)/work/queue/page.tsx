"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchWorkQueueApi } from "@/lib/api/work-queue";
import { CATEGORY_LABELS, type WorkQueueItem, type WorkQueueCategory } from "@/lib/types/work-queue";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEVERITY_ICON: Record<string, keyof typeof Icons> = {
  info: "Info",
  warning: "AlertTriangle",
  error: "AlertCircle",
};

export default function WorkQueuePage() {
  const [items, setItems] = React.useState<WorkQueueItem[]>([]);

  React.useEffect(() => {
    let active = true;
    void fetchWorkQueueApi()
      .then((rows) => {
        if (!active) return;
        setItems(rows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Failed to load work queue.");
        setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const byCategory = React.useMemo(() => {
    const m = new Map<WorkQueueCategory, WorkQueueItem[]>();
    for (const it of items) {
      const list = m.get(it.category) ?? [];
      list.push(it);
      m.set(it.category, list);
    }
    return m;
  }, [items]);

  return (
    <PageShell>
      <PageHeader
        title="Work queue"
        description="Payroll, tax, and pricing alerts. Act on items or drill down."
        breadcrumbs={[{ label: "Work queue" }]}
        sticky
        showCommandHint
        actions={
          <ExplainThis
            prompt="Explain work queue alerts for payroll, tax, and pricing."
            label="Explain"
          />
        }
      />
      <div className="p-6 space-y-6">
        {Array.from(byCategory.keys()).map((cat) => {
          const list = byCategory.get(cat) ?? [];
          if (list.length === 0) return null;
          return (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {CATEGORY_LABELS[cat] ?? cat}
                  <Badge variant="secondary">{list.length}</Badge>
                </CardTitle>
                <CardDescription>
                  {(cat === "approvals" || cat === "approval") && "Documents pending your review and approval."}
                  {(cat === "anomalies" || cat === "anomaly") && "Anomalies requiring investigation and corrective action."}
                  {cat === "inventory" && "Stockouts, low stock, and reorder alerts."}
                  {cat === "ar" && "Overdue invoices, unallocated receipts."}
                  {cat === "ap" && "Bills due, payment reminders."}
                  {cat === "bank" && "Unmatched lines, reconciliation items."}
                  {cat === "payroll" && "Pay run approval, employee statutory details."}
                  {cat === "tax" && "VAT mapping, mismatched tax category."}
                  {cat === "pricing" && "Missing tiers, margin heuristics."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {list.map((it) => {
                    const SevIcon = (Icons[SEVERITY_ICON[it.severity] ?? "Info"]) as React.ComponentType<{ className?: string }>;
                    return (
                      <div
                        key={it.id}
                        className={`flex items-center justify-between gap-4 px-4 py-3 ${
                          it.severity === "error" ? "bg-destructive/5 border-l-2 border-l-destructive" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SevIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{it.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{it.description}</p>
                          </div>
                        </div>
                        {it.href && (
                          <Button size="sm" variant="outline" className="shrink-0" asChild>
                            <Link href={it.href}>View</Link>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
