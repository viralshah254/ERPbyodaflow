"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchOpsRunbookApi, runRetentionJobApi, saveOpsRunbookApi, type OpsRunbookPayload } from "@/lib/api/ops";
import { toast } from "sonner";

export default function OpsRunbookPage() {
  const [state, setState] = React.useState<OpsRunbookPayload | null>(null);
  const [retentionDays, setRetentionDays] = React.useState("2555");

  const load = React.useCallback(async () => {
    try {
      setState(await fetchOpsRunbookApi());
    } catch (error) {
      toast.error((error as Error).message || "Failed to load runbook.");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!state) {
    return (
      <PageShell>
        <PageHeader title="Operational runbook" breadcrumbs={[{ label: "Settings", href: "/settings/org" }, { label: "Operational runbook" }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Operational runbook"
        description="Track readiness checks, dependencies, and retention/release gates."
        breadcrumbs={[{ label: "Settings", href: "/settings/org" }, { label: "Operational runbook" }]}
        sticky
        showCommandHint
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Retention job</CardTitle>
            <CardDescription>Run audit retention and track last execution status.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Input value={retentionDays} onChange={(event) => setRetentionDays(event.target.value)} className="w-40" />
            <Button
              onClick={async () => {
                const result = await runRetentionJobApi(Number(retentionDays));
                toast.success(`Retention complete. Deleted ${result.deletedCount} rows.`);
                await load();
              }}
            >
              Run retention
            </Button>
            <span className="text-xs text-muted-foreground">
              Last run: {state.retention.lastRunAt ? new Date(state.retention.lastRunAt).toLocaleString() : "—"} · {state.retention.status}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Release gates</CardTitle>
            <CardDescription>Checklist before deployment go/no-go.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(state.releaseGates ?? []).map((gate, index) => (
              <div key={gate.key || index} className="flex items-center gap-2 rounded border p-2">
                <Checkbox
                  checked={gate.checked}
                  onCheckedChange={(checked) => {
                    const updated = [...state.releaseGates];
                    updated[index] = { ...updated[index], checked: !!checked };
                    setState({ ...state, releaseGates: updated });
                  }}
                />
                <span className="text-sm">{gate.label}</span>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={async () => {
                await saveOpsRunbookApi(state);
                toast.success("Runbook saved.");
              }}
            >
              Save checklist
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
