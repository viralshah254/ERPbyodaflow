"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TaskItem } from "@/lib/mock/dashboard";
import { cn } from "@/lib/utils";

interface MyTasksCardProps {
  items: TaskItem[];
}

export function MyTasksCard({ items }: MyTasksCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">My tasks</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inbox">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No tasks.</p>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                  t.status === "overdue" && "border-destructive/50 bg-destructive/5"
                )}
              >
                <span className="font-medium">{t.title}</span>
                <span
                  className={cn(
                    "text-xs",
                    t.status === "overdue" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {t.status === "overdue" ? "Overdue" : t.dueAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
