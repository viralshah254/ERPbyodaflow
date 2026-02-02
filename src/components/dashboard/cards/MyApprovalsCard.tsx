"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import type { ApprovalItem } from "@/lib/mock/dashboard";

interface MyApprovalsCardProps {
  items: ApprovalItem[];
}

export function MyApprovalsCard({ items }: MyApprovalsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">My approvals</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inbox">View all</Link>
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
                className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{a.reference}</p>
                  <p className="text-muted-foreground">{a.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.requestedBy}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="default">
                    Approve
                  </Button>
                  <Button size="sm" variant="outline">
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
