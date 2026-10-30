"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { fetchDocumentHub, updateHubRule } from "@/lib/api/document-hub";
import type { DocumentLearningRule } from "@/lib/types/document-hub";
import { toast } from "sonner";

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export default function DocumentHubRulesPage() {
  const [rules, setRules] = React.useState<DocumentLearningRule[]>([]);

  const load = React.useCallback(async () => {
    const next = await fetchDocumentHub();
    setRules(next.rules ?? []);
  }, []);

  React.useEffect(() => {
    void load().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Could not load learned rules.");
    });
  }, [load]);

  const run = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The rule was not saved.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Learned rules"
        description="Proposed from files you have already classified. An administrator confirms a rule before it changes later documents."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Document Hub", href: "/documents/hub" }, { label: "Learned rules" }]}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 sm:p-6">
        {rules.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No proposed rules yet. Confirm a classification on a file and it will show up here.</p>
        ) : null}
        {rules.map((rule) => (
          <article key={rule._id} className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">{rule.partyName || "Any party"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labelize(rule.documentType)} · {rule.status} · {labelize(rule.mode)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { status: "confirmed" }), "Rule confirmed.")}>Confirm</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { mode: "suggest" }), "Rule will only suggest.")}>Suggest</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { mode: "draft" }), "Rule will prepare a draft.")}>Draft</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { mode: "auto_post" }), "Eligible exact matches can be marked auto-processed. The ledger is still posted from the ERP document.")}>Auto-process</Button>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
