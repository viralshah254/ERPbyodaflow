"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchErpApi, type ErpSearchHit } from "@/lib/api/erp-search";
import { apiRequest } from "@/lib/api/client";
import { Send, MessageSquare } from "lucide-react";
import type { CopilotBlock } from "@/types/copilot";
import { CopilotBlocks } from "./CopilotBlocks";
import { useCopilotStore } from "@/stores/copilot-store";

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

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  hits?: ErpSearchHit[];
  blocks?: CopilotBlock[];
};

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
  const context = useCopilotStore((state) => state.context);
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Ask me to find customers, products, invoices, payments, warehouses, or linked records.",
    },
  ]);
  const [sending, setSending] = React.useState(false);
  React.useEffect(() => {
    if (!prefillPrompt) return;
    setMessage(prefillPrompt);
    onConsumePrefill?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- consume once when prefillPrompt set
  }, [prefillPrompt]);

  const runSearch = React.useCallback(async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setSending(true);
    try {
      const response = await searchErpApi(trimmed, context);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: response.copilot?.summary ?? response.summary,
          hits: response.hits,
          blocks: response.copilot?.blocks,
        },
      ]);
      setMessage("");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: (error as Error).message || "Search failed.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }, []);

  const confirmAction = React.useCallback(async (actionId: string, actionType: string) => {
    const query = actionType === "approve_document" ? "approve document" : "create invoice draft";
    try {
      const result = await apiRequest<{ success: boolean; message?: string }>("/api/command/execute", {
        method: "POST",
        body: { confirm: true, requestId: actionId, query },
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-confirm-${Date.now()}`,
          role: "assistant",
          text: result.message ?? "Action confirmed.",
          blocks: [{ type: "execution_status", status: "success", message: result.message ?? "Action accepted." }],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-confirm-${Date.now()}`,
          role: "assistant",
          text: (error as Error).message || "Confirmation failed.",
          blocks: [{ type: "execution_status", status: "failed", message: (error as Error).message || "Confirmation failed." }],
        },
      ]);
    }
  }, []);

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
          {messages.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg border p-3 text-sm ${entry.role === "user" ? "bg-primary/5" : "bg-muted/30"}`}
            >
              <p className="text-muted-foreground">{entry.text}</p>
              {entry.blocks?.length ? <CopilotBlocks blocks={entry.blocks} onConfirmAction={confirmAction} /> : null}
              {entry.hits?.length ? (
                <div className="mt-3 space-y-2">
                  {entry.hits.map((hit) => (
                    <Link
                      key={`${entry.id}-${hit.entityType}-${hit.id}`}
                      href={hit.href}
                      className="block rounded border bg-background px-3 py-2 hover:bg-accent/50"
                    >
                      <div className="font-medium">{hit.title}</div>
                      {hit.subtitle ? (
                        <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
                      ) : null}
                      {hit.relationships?.length ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Linked: {hit.relationships.map((item) => item.label).join(" · ")}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
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
                onClick={() => {
                  onQuickPrompt?.(p);
                  setMessage(p);
                  void runSearch(p);
                }}
              >
                {p}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <Link href="/tutorial" className="hover:text-foreground underline">
              Open product tutorial
            </Link>
          </p>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-2 flex gap-2">
        <Input
          placeholder="Ask or propose an action..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !sending) {
              e.preventDefault();
              void runSearch(message);
            }
          }}
        />
        <Button
          size="icon"
          variant="secondary"
          disabled={sending || !message.trim()}
          onClick={() => void runSearch(message)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
