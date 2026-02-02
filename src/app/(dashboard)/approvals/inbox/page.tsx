"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMockApprovalInbox, type ApprovalItem } from "@/lib/mock/approvals";
import { formatMoney } from "@/lib/money";
import { ApprovalSheet } from "@/components/approvals/ApprovalSheet";
import * as Icons from "lucide-react";

export default function ApprovalsInboxPage() {
  const [selected, setSelected] = React.useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const items = React.useMemo(() => getMockApprovalInbox(), []);

  const openSheet = (item: ApprovalItem) => {
    setSelected(item);
    setSheetOpen(true);
  };

  const handleApprove = (id: string, comment?: string) => {
    window.alert(`Approve (stub): ${id}${comment ? ` — ${comment}` : ""}`);
  };

  const handleReject = (id: string, comment?: string) => {
    window.alert(`Reject (stub): ${id}${comment ? ` — ${comment}` : ""}`);
  };

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
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No items pending your approval.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => handleReject(a.id)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(a.id)}>
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
