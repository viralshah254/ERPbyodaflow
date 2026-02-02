"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface CopilotChatProps {
  threads?: ThreadSummary[];
  currentThreadId?: string | null;
  onSelectThread?: (id: string) => void;
  onNewThread?: () => void;
  quickPrompts?: string[];
  onQuickPrompt?: (prompt: string) => void;
  /** When set, prefill input and focus. Call onConsumePrefill after applied. */
  prefillPrompt?: string | null;
  onConsumePrefill?: () => void;
}

const defaultThreads: ThreadSummary[] = [
  { id: "1", title: "Sales order suggestions", updatedAt: "2m ago" },
  { id: "2", title: "Stock levels", updatedAt: "1h ago" },
];

export function CopilotChat({
  threads = defaultThreads,
  currentThreadId,
  onSelectThread,
  onNewThread,
  quickPrompts = [
    "Suggest reorder for low stock",
    "Create sales order from last week's top customers",
    "Show overdue receivables",
  ],
  onQuickPrompt,
  prefillPrompt,
  onConsumePrefill,
}: CopilotChatProps) {
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
    if (!prefillPrompt) return;
    setMessage(prefillPrompt);
    onConsumePrefill?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- consume once when prefillPrompt set
  }, [prefillPrompt]);

  return (
    <div className="flex h-full flex-col">
      {/* Thread list */}
      <div className="border-b p-2">
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onNewThread}>
          <MessageSquare className="h-4 w-4" />
          New chat
        </Button>
        <ScrollArea className="mt-2 h-24">
          <div className="space-y-1">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectThread?.(t.id)}
                className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent ${currentThreadId === t.id ? "bg-accent" : ""}`}
              >
                <div className="truncate font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.updatedAt}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">Ask me to create or update documents, suggest next steps, or explain data.</p>
          </div>
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      {quickPrompts.length > 0 && (
        <div className="border-t p-2">
          <p className="text-xs text-muted-foreground mb-2">Quick prompts</p>
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((p, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onQuickPrompt?.(p) || setMessage(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-2 flex gap-2">
        <Input
          placeholder="Ask or propose an action..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
        />
        <Button size="icon" variant="secondary">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
