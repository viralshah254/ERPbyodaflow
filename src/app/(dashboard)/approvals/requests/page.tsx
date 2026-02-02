"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockApprovalRequests, type ApprovalItem } from "@/lib/mock/approvals";
import { formatMoney } from "@/lib/money";
import { ApprovalSheet } from "@/components/approvals/ApprovalSheet";
import * as Icons from "lucide-react";

export default function ApprovalsRequestsPage() {
  const [selected, setSelected] = React.useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const items = React.useMemo(() => getMockApprovalRequests(), []);

  const openSheet = (item: ApprovalItem) => {
    setSelected(item);
    setSheetOpen(true);
  };

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
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No approval requests submitted by you.
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
                      <Icons.Send className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{a.documentNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.documentType} · {formatMoney(a.amount, a.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(a.requestedAt).toLocaleString()}
                        </p>
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
      />
    </PageShell>
  );
}
