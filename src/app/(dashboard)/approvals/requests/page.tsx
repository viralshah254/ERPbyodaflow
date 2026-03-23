"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApprovalItem } from "@/lib/types/approvals";
import { formatMoney } from "@/lib/money";
import { ApprovalSheet } from "@/components/approvals/ApprovalSheet";
import { approveApprovalApi, fetchApprovalRequests, rejectApprovalApi } from "@/lib/api/approvals";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ApprovalsRequestsPage() {
  const [selected, setSelected] = React.useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [items, setItems] = React.useState<ApprovalItem[]>([]);
  const [filter, setFilter] = React.useState<"all" | "credit-breach">("all");
  const [loading, setLoading] = React.useState(true);

  const openSheet = (item: ApprovalItem) => {
    setSelected(item);
    setSheetOpen(true);
  };

  const refreshItems = React.useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchApprovalRequests());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApprove = async (id: string, comment?: string) => {
    try {
      await approveApprovalApi(id, comment);
      await refreshItems();
      if (selected?.id === id) setSheetOpen(false);
      toast.success("Credit override approved.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleReject = async (id: string, comment?: string) => {
    try {
      await rejectApprovalApi(id, comment);
      await refreshItems();
      if (selected?.id === id) setSheetOpen(false);
      toast.success("Rejected — document reverted to draft.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  React.useEffect(() => {
    void refreshItems();
  }, [refreshItems]);

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
        title="My requests"
        description="Items you submitted for approval"
        breadcrumbs={[
          { label: "Approvals", href: "/approvals/inbox" },
          { label: "Requests" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Submitted</CardTitle>
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
                Loading approval requests...
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {filter === "credit-breach"
                  ? "No credit breach requests submitted by you."
                  : "No approval requests submitted by you."}
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
                      <Icons.Send className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{a.documentNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.documentType} · {formatMoney(a.amount, a.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(a.requestedAt).toLocaleString()}
                        </p>
                        {a.creditBreachReason && (
                          <p className="mt-1 text-xs rounded bg-amber-500/10 text-amber-800 dark:text-amber-200 px-2 py-1 inline-block">
                            Credit breach workflow
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={a.status === "pending" ? "secondary" : "default"}>
                      {a.status}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => openSheet(a)}>
                      View
                    </Button>
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
        onApprove={selected?.creditBreachReason && selected.status === "pending" ? handleApprove : undefined}
        onReject={selected?.creditBreachReason && selected.status === "pending" ? handleReject : undefined}
      />
    </PageShell>
  );
}
