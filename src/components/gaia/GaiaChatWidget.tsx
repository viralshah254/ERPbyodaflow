"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Trash2, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  clearGaiaSessionCache,
  isGaiaConfigured,
  resetGaiaChat,
  sendGaiaMessage,
} from "@/lib/gaia/gaia-service";
import { GaiaMessageBody } from "@/lib/gaia/render-message";
import { useDraggableFloater } from "@/hooks/useDraggableFloater";
import { FloaterTooltip } from "./FloaterTooltip";
import { GaiaOrb } from "./GaiaOrb";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

const WELCOME =
  "Hey — I'm Gaia, your OdaFlow ERP assistant. Ask about sales orders, stock, invoices and customers, or ask me how a flow works — order to cash, goods receipt to supplier bill, setting up a new company, or connecting this ERP to OdaFlow.";

const QUICK_PROMPTS = [
  "What should I check first today?",
  "How do I connect this ERP to OdaFlow?",
  "Where do I record a goods receipt?",
  "Why would a supplier bill be blocked?",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Floating Gaia chat for ERP dashboard users — uses their ERP session. */
export function GaiaChatWidget() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const configured = isGaiaConfigured();
  const enabled = configured && isAuthenticated;

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [isDark, setIsDark] = React.useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const {
    rootRef: floaterRootRef,
    rootStyle,
    isDragging,
    hasCustomPosition,
    getOrbProps,
  } = useDraggableFloater("gaia");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const sync = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const scroller = messagesRef.current;
    if (scroller) {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
    setTimeout(() => inputRef.current?.focus(), 160);
  }, [open, messages, loading, reducedMotion]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendRef = React.useRef<(text: string) => Promise<void>>(async () => undefined);

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
        const msg =
          err instanceof Error
            ? err.message
            : "Something went wrong talking to Gaia. Try again in a moment.";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content:
              msg.includes("401") || msg.toLowerCase().includes("sign in")
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

  sendRef.current = send;

  React.useEffect(() => {
    const onAsk = (e: Event) => {
      const message = (e as CustomEvent<{ message?: string }>).detail?.message;
      if (!message) return;
      setOpen(true);
      void sendRef.current(message);
    };
    window.addEventListener("gaia:ask", onAsk);
    return () => window.removeEventListener("gaia:ask", onAsk);
  }, []);

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

  if (!enabled || !mounted) return null;

  const statusLabel = loading ? "Thinking…" : "Ready";
  const orbState = loading ? "thinking" : open ? "open" : "idle";

  const panelTransition = reducedMotion
    ? { duration: 0.12 }
    : { type: "spring" as const, stiffness: 220, damping: 22, mass: 0.7 };

  const onPanelPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gaia-mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--gaia-my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const ui = (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            key="gaia-backdrop"
            className="gaia-backdrop"
            aria-label="Close Gaia"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.4 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        ref={floaterRootRef}
        className={`gaia-widget-root${hasCustomPosition ? " is-custom" : ""}${isDragging ? " is-dragging" : ""}`}
        data-gaia-widget=""
        style={rootStyle}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key="gaia-panel"
              layoutId={reducedMotion ? undefined : "gaia-stage"}
              className={`gaia-panel ${isDark ? "gaia-panel--dark" : "gaia-panel--light"}`}
              role="dialog"
              aria-label="Gaia assistant"
              initial={
                reducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 0.58, y: 48, transformOrigin: "bottom right" }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.82, y: 24 }
              }
              transition={panelTransition}
              onPointerMove={reducedMotion ? undefined : onPanelPointer}
            >
              <div className="gaia-panel__aurora" aria-hidden />
              <div className="gaia-panel__caustic" aria-hidden />
              <div className="gaia-panel__sheen" aria-hidden />
              <div className="gaia-panel__rim" aria-hidden />

              <header className="gaia-header">
                <div className="gaia-header__mark" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h2 className="gaia-brand">Gaia</h2>
                  <p className="gaia-status">
                    <span
                      className={`gaia-status-dot ${
                        loading ? "gaia-status-dot--busy" : "gaia-status-dot--ok"
                      }`}
                    />
                    {statusLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearChat}
                  className="gaia-icon-btn"
                  title="Clear conversation"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="gaia-icon-btn"
                  title="Close"
                  aria-label="Close Gaia"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} />
                  Close
                </button>
              </header>

              <div ref={messagesRef} className="gaia-messages space-y-3">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div
                      className={`gaia-bubble min-w-0 max-w-[88%] overflow-hidden text-[13.5px] leading-[1.55] ${
                        m.role === "user" ? "gaia-bubble--user" : "gaia-bubble--ai"
                      }`}
                    >
                      <GaiaMessageBody text={m.content} tone={m.role} />
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start" aria-label="Gaia is typing">
                    <div className="gaia-bubble gaia-bubble--ai gaia-wave">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                {configured && !loading && messages.length <= 1 && (
                  <div className="gaia-prompts pt-1">
                    <p className="gaia-prompts__label">Try asking</p>
                    <div className="flex flex-col gap-2">
                      {QUICK_PROMPTS.map((q, i) => (
                        <motion.button
                          key={q}
                          type="button"
                          onClick={() => void send(q)}
                          className="gaia-prompt"
                          initial={reducedMotion ? false : { opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 + i * 0.06, duration: 0.35, ease: "easeOut" }}
                        >
                          {q}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <form
                className="gaia-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
              >
                <div className="gaia-composer__dock">
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
                    placeholder="Ask Gaia anything…"
                    disabled={loading}
                    className="gaia-composer__input"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="gaia-composer__send"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </div>
                <p className="gaia-disclaimer">
                  AI assistant for OdaFlow — verify critical numbers before acting.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <FloaterTooltip label="Ask Gaia" hidden={isDragging}>
          <GaiaOrb
            state={orbState}
            reducedMotion={reducedMotion}
            open={open}
            isDragging={isDragging}
            {...getOrbProps(() => setOpen((v) => !v))}
          />
        </FloaterTooltip>
      </div>
    </>
  );

  return createPortal(ui, document.body);
}
