"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApprovalItem } from "@/lib/types/approvals";
import { formatMoney } from "@/lib/money";
import { drillToDocument } from "@/lib/drill-through";
import { ApprovalSheet } from "@/components/approvals/ApprovalSheet";
import { approveApprovalApi, fetchApprovalInbox, rejectApprovalApi } from "@/lib/api/approvals";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function ApprovalsInboxContent() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [items, setItems] = React.useState<ApprovalItem[]>([]);
  const [filter, setFilter] = React.useState<"all" | "credit-breach">("all");
  const [loading, setLoading] = React.useState(true);
  const requestedApprovalId = searchParams.get("approvalId");

  const openSheet = (item: ApprovalItem) => {
    setSelected(item);
    setSheetOpen(true);
  };

  const refreshItems = React.useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchApprovalInbox());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshItems();
  }, [refreshItems]);

  React.useEffect(() => {
    if (!requestedApprovalId || items.length === 0) return;
    const match = items.find((item) => item.id === requestedApprovalId);
    if (match) {
      setSelected(match);
      setSheetOpen(true);
    }
  }, [items, requestedApprovalId]);

  const handleApprove = async (id: string, comment?: string) => {
    try {
      await approveApprovalApi(id, comment);
      await refreshItems();
      if (selected?.id === id) setSheetOpen(false);
      toast.success("Approved.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleReject = async (id: string, comment?: string) => {
    try {
      await rejectApprovalApi(id, comment);
      await refreshItems();
      if (selected?.id === id) setSheetOpen(false);
      toast.success("Rejected.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filteredItems = React.useMemo(() => {
    if (filter === "credit-breach") {
      return items.filter((item) => Boolean(item.creditBreachReason));
    }
    return items;
  }, [filter, items]);

  const creditBreachCount = React.useMemo(
    () => items.filter((item) => Boolean(item.creditBreachReason)).length,
    [items]
  );

  return (
    <PageShell>
      <PageHeader
        title="Approvals Inbox"
        description="Items requiring your approval"
        breadcrumbs={[
          { label: "Approvals", href: "/approvals/inbox" },
          { label: "Inbox" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All ({items.length})
              </Button>
              <Button
                size="sm"
                variant={filter === "credit-breach" ? "default" : "outline"}
                onClick={() => setFilter("credit-breach")}
              >
                Credit Breach ({creditBreachCount})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Loading approvals...
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {filter === "credit-breach"
                  ? "No credit breach approvals are pending."
                  : "No items pending your approval."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => openSheet(a)}
                  >
                    <div className="flex items-center gap-3">
                      <Icons.FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{a.documentNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.documentType} · {formatMoney(a.amount, a.currency)}
                          {a.baseEquivalent != null && a.currency !== "KES" && (
                            <span> (base: {formatMoney(a.baseEquivalent, "KES")})</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested by {a.requester} · {new Date(a.requestedAt).toLocaleString()}
                        </p>
                        {a.creditBreachReason && (
                          <p className="mt-1 text-xs rounded bg-amber-500/10 text-amber-800 dark:text-amber-200 px-2 py-1 inline-block">
                            Credit breach: review reason before decision
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={drillToDocument(a.documentType, a.documentId).href}>View</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openSheet(a)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => openSheet(a)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openSheet(a)}>
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ApprovalSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={selected}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </PageShell>
  );
}

export default function ApprovalsInboxPage() {
  return (
    <React.Suspense fallback={
      <PageShell>
        <PageHeader title="Approvals Inbox" description="Items requiring your approval" breadcrumbs={[{ label: "Approvals", href: "/approvals/inbox" }, { label: "Inbox" }]} sticky showCommandHint />
        <div className="p-6">
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        </div>
      </PageShell>
    }>
      <ApprovalsInboxContent />
    </React.Suspense>
  );
}
