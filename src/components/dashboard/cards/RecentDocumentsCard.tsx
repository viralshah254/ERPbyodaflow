"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RecentDoc } from "@/lib/mock/dashboard";

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
          <div className="space-y-2">
            {items.map((d) => (
              <Link
                key={d.id}
                href={`/docs/${d.type}/${d.id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent/50"
              >
                <div>
                  <p className="font-medium">{d.number}</p>
                  <p className="text-muted-foreground text-xs">{d.party ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">KES {d.total.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs">
                    {d.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
