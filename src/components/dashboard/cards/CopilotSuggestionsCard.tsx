"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCopilotStore } from "@/stores/copilot-store";
import * as Icons from "lucide-react";

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  actionUrl?: string;
}

interface CopilotSuggestionsCardProps {
  items: Suggestion[];
}

export function CopilotSuggestionsCard({ items }: CopilotSuggestionsCardProps) {
  const openDrawer = useCopilotStore((s) => s.openDrawer);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icons.Sparkles className="h-4 w-4 text-primary" />
          Copilot suggestions
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={openDrawer}>
          Open Copilot
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No suggestions. Ask Copilot for help.</p>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div
                key={s.id}
                className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-muted-foreground text-xs">{s.description}</p>
                </div>
                {s.actionUrl ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={s.actionUrl}>Go</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={openDrawer}>
                    Ask
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
