"use client";

import * as React from "react";
import { MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  clearGaiaSessionCache,
  isGaiaConfigured,
  resetGaiaChat,
  sendGaiaMessage,
} from "@/lib/gaia/gaia-service";
import { GaiaMessageBody } from "@/lib/gaia/render-message";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

const WELCOME =
  "Hey — I'm Gaia, your OdaFlow ERP assistant. Ask about sales orders, stock, invoices and customers, or ask me how a flow works — order to cash, goods receipt to supplier bill, setting up a new company, or connecting this ERP to OdaFlow.";

// Two live-data asks and two how-does-this-work asks. The second pair is
// where Gaia is strongest on ERP: it reads the routers and nav configs,
// so it answers with the real menu path and the step you are missing
// rather than a plausible-sounding guess.
const QUICK_PROMPTS = [
  "What should I check first today?",
  "How do I connect this ERP to OdaFlow?",
  "Where do I record a goods receipt?",
  "Why would a supplier bill be blocked?",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Floating Gaia chat for ERP dashboard users — uses their ERP session. */
export function GaiaChatWidget() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enabled = isGaiaConfigured() && isAuthenticated;

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages, loading]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setMessages((prev) => [...prev, { id: uid(), role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);
      try {
        const reply = await sendGaiaMessage(trimmed);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: reply || "I could not find an answer for that.",
          },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong talking to Gaia.";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content:
              msg.toLowerCase().includes("sign in") || msg.includes("401")
                ? "Your session expired. Refresh the page and sign in again."
                : `I hit a snag: ${msg}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const clearChat = async () => {
    if (!confirm("Clear this Gaia conversation?")) return;
    try {
      await resetGaiaChat();
    } catch {
      /* local clear still useful */
    }
    clearGaiaSessionCache();
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
  };

  if (!enabled) return null;

  return (
    <div
      data-gaia-widget=""
      className="pointer-events-none fixed bottom-24 right-5 z-40 flex flex-col items-end gap-3"
    >
      {open ? (
        <div
          className="pointer-events-auto flex h-[min(72vh,640px)] w-[min(100vw-1.5rem,400px)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          role="dialog"
          aria-label="Gaia assistant"
        >
        <header className="flex items-center gap-3 bg-gradient-to-r from-[#012A4A] to-[#0A73B7] px-4 py-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-semibold tracking-tight ring-1 ring-white/20">
            G
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-tight tracking-tight">Gaia</div>
            <div className="flex items-center gap-1.5 text-[11px] text-sky-100/90">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  loading ? "animate-pulse bg-amber-300" : "bg-emerald-300"
                }`}
              />
              {loading ? "Typing…" : "OdaFlow · ERP"}
            </div>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            title="Close"
            aria-label="Close Gaia"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-3.5 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#075985] to-[#0A73B7] text-[11px] font-semibold text-white shadow-sm">
                  G
                </div>
              )}
              <div
                className={`min-w-0 max-w-[82%] overflow-hidden rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-md bg-[#075985] text-white"
                    : "rounded-bl-md border border-sky-100 bg-sky-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                <GaiaMessageBody text={m.content} tone={m.role} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#075985] to-[#0A73B7] text-[11px] font-semibold text-white">
                G
              </div>
              <div
                className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-sky-100 bg-sky-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800"
                aria-label="Gaia is typing"
              >
                <span className="gaia-dot" />
                <span className="gaia-dot" style={{ animationDelay: "0.15s" }} />
                <span className="gaia-dot" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}

          {!loading && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  className="rounded-xl border border-sky-200 px-3 py-2 text-left text-[12px] text-[#075985] transition hover:bg-sky-50 dark:border-slate-600 dark:text-sky-300 dark:hover:bg-slate-800"
                >
                  <Sparkles className="mr-1 inline h-3 w-3 opacity-70" />
                  {q}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-sky-100 px-3 py-3 dark:border-slate-700"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Message Gaia…"
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-sky-200 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0A73B7] focus:ring-2 focus:ring-[#0A73B7]/35 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A73B7] text-white shadow-md transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10.5px] text-slate-500 dark:text-slate-400">
            Gaia is an AI assistant for OdaFlow. Double-check important numbers before acting.
          </p>
        </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#075985] to-[#0A73B7] text-white shadow-lg ring-2 ring-white/30 transition hover:scale-105 active:scale-95"
        aria-label={open ? "Close Gaia" : "Open Gaia"}
        title="Ask Gaia"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </span>
        )}
      </button>

      <style>{`
        .gaia-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #0a73b7;
          display: inline-block;
          animation: gaia-bounce 1.1s ease-in-out infinite;
        }
        @keyframes gaia-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
