"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import type { ApprovalItem } from "@/lib/mock/dashboard";
import { ApprovalDetailSheet } from "@/components/approvals/ApprovalDetailSheet";

interface MyApprovalsCardProps {
  items: ApprovalItem[];
}

export function MyApprovalsCard({ items }: MyApprovalsCardProps) {
  const [detailItem, setDetailItem] = React.useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const openDetail = (a: ApprovalItem) => {
    setDetailItem(a);
    setSheetOpen(true);
  };

  const handleApprove = (id: string, comment?: string) => {
    toast.success(comment ? `Approved with comment. (stub)` : `Approved. (stub). API pending.`);
    setSheetOpen(false);
  };

  const handleReject = (id: string, comment?: string) => {
    toast.info(comment ? `Rejected with comment. (stub)` : `Rejected. (stub). API pending.`);
    setSheetOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">My approvals</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/approvals/inbox">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No pending approvals.</p>
          ) : (
            <div className="space-y-3">
              {items.map((a) => (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(a)}
                  onKeyDown={(e) => e.key === "Enter" && openDetail(a)}
                  className="rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.reference}</p>
                      <p className="text-muted-foreground truncate">{a.summary}</p>
                      {a.party && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.party}</p>
                      )}
                      {a.amount != null && a.amount > 0 && (
                        <p className="text-xs font-medium text-foreground mt-0.5">
                          {formatMoney(a.amount, a.currency ?? "KES")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{a.requestedBy}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-primary hover:text-primary"
                        onClick={() => openDetail(a)}
                      >
                        <Icons.Eye className="mr-1 h-3.5 w-3.5" />
                        Details
                      </Button>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={() => handleApprove(a.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleReject(a.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ApprovalDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={detailItem}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}
