"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { fetchDocumentHub, updateHubRule } from "@/lib/api/document-hub";
import type { DocumentLearningRule } from "@/lib/types/document-hub";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODES = [
  {
    id: "suggest" as const,
    label: "Suggest",
    detail: "Shows a suggestion. Someone still decides. Nothing is created on its own.",
  },
  {
    id: "draft" as const,
    label: "Draft",
    detail: "Puts a matched file in the queue for approval. It does not post the bill.",
  },
  {
    id: "auto_post" as const,
    label: "Auto-process",
    detail: "Attaches the file when it exactly matches a bill that already exists. The ledger is still posted from that bill, not from the scan.",
  },
];

function titleCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type RuleGroup = {
  key: string;
  sample: DocumentLearningRule;
  ids: string[];
};

function groupRules(rules: DocumentLearningRule[]): RuleGroup[] {
  const buckets = new Map<string, RuleGroup>();
  for (const rule of rules) {
    const key = [rule.partyName ?? "", rule.documentType, rule.status, rule.mode].join("|");
    const existing = buckets.get(key);
    if (existing) {
      existing.ids.push(rule._id);
    } else {
      buckets.set(key, { key, sample: rule, ids: [rule._id] });
    }
  }
  return [...buckets.values()].sort((a, b) => {
    if (a.sample.status !== b.sample.status) return a.sample.status === "proposed" ? -1 : 1;
    return (a.sample.partyName ?? "").localeCompare(b.sample.partyName ?? "");
  });
}

export default function DocumentHubRulesPage() {
  const [rules, setRules] = React.useState<DocumentLearningRule[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const next = await fetchDocumentHub();
    setRules(next.rules ?? []);
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    void load().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Could not load learned rules.");
    });
  }, [load]);

  const groups = groupRules(rules);
  const waiting = groups.filter((group) => group.sample.status === "proposed").length;
  const active = groups.length - waiting;

  const run = async (key: string, work: () => Promise<unknown>, success: string) => {
    setBusyKey(key);
    try {
      await work();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The rule was not saved.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Learned rules"
        description="A memory of how you classified a supplier. It stays off until you confirm it."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Document Hub", href: "/documents/hub" }, { label: "Learned rules" }]}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border bg-card px-3 py-1.5 text-sm">
            <span className="font-semibold tabular-nums">{waiting}</span>
            <span className="text-muted-foreground"> waiting</span>
          </span>
          <span className="rounded-full border bg-card px-3 py-1.5 text-sm">
            <span className="font-semibold tabular-nums">{active}</span>
            <span className="text-muted-foreground"> on</span>
          </span>
        </div>

        {!loaded ? (
          <p className="text-[15px] text-muted-foreground">Loading rules…</p>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-semibold tracking-tight">No rules yet</h2>
            <p className="mt-1 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
              Classify a file in the inbox and confirm the document type. The supplier shows up here as a proposal. Later files stay unchanged until you confirm that proposal.
            </p>
            <Button asChild className="mt-4 h-11">
              <Link href="/documents/hub">Open the inbox</Link>
            </Button>
          </div>
        ) : (
          groups.map((group) => {
            const rule = group.sample;
            const proposed = rule.status === "proposed";
            const mode = MODES.find((item) => item.id === rule.mode) ?? MODES[0];
            const busy = busyKey === group.key;
            const party = rule.partyName || "Any supplier";
            return (
              <article key={group.key} className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight">{party}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {titleCase(rule.documentType)}
                      {group.ids.length > 1 ? ` · from ${group.ids.length} files` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
                      proposed ? "text-muted-foreground" : "border-primary/40 bg-primary/15 text-primary",
                    )}
                  >
                    {proposed ? null : <Check className="h-3.5 w-3.5" aria-hidden />}
                    {proposed ? "Not on yet" : "On"}
                  </span>
                </div>

                <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
                  {proposed
                    ? "Confirm this rule before the next file from this supplier is handled this way."
                    : `The next file from this supplier is treated as a ${titleCase(rule.documentType).toLowerCase()}.`}
                </p>

                <fieldset className="mt-4" disabled={busy}>
                  <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Handling</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`Handling for ${party}`}>
                    {MODES.map((item) => {
                      const selected = rule.mode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={cn(
                            "min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background hover:bg-muted/60",
                          )}
                          onClick={() => {
                            if (selected || busy) return;
                            void run(
                              group.key,
                              () => Promise.all(group.ids.map((id) => updateHubRule(id, { mode: item.id }))),
                              `${item.label} saved. ${proposed ? "Confirm the rule before it applies." : "Later files follow this handling."}`,
                            );
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{mode.detail}</p>
                </fieldset>

                {proposed ? (
                  <Button
                    type="button"
                    className="mt-4 h-11"
                    disabled={busy}
                    onClick={() => void run(
                      group.key,
                      () => Promise.all(group.ids.map((id) => updateHubRule(id, { status: "confirmed" }))),
                      group.ids.length > 1 ? "Rules confirmed. Later files from this supplier follow them." : "Rule confirmed. Later files from this supplier follow it.",
                    )}
                  >
                    {busy ? "Saving…" : "Confirm rule"}
                  </Button>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
