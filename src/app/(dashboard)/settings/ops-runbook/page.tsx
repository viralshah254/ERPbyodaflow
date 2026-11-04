"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchOpsRunbookApi, previewRetentionJobApi, runRetentionJobApi, type AuditRetentionPreview, saveOpsRunbookApi, type OpsRunbookPayload } from "@/lib/api/ops";
import { toast } from "sonner";

export default function OpsRunbookPage() {
  const [preview, setPreview] = React.useState<AuditRetentionPreview | null>(null);
  const [confirmation, setConfirmation] = React.useState("");
  const [retentionBusy, setRetentionBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [state, setState] = React.useState<OpsRunbookPayload | null>(null);
  const [retentionDays, setRetentionDays] = React.useState("2555");

  const load = React.useCallback(async () => {
    try {
      setState(await fetchOpsRunbookApi()); setLoadError("");
    } catch (error) {
      setLoadError((error as Error).message || "Failed to load runbook.");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!state) {
    return (
      <PageShell>
        <PageHeader title="Operational runbook" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Operational runbook" }]} />
        <div className="p-6 text-sm text-muted-foreground">{loadError || "Loading…"}{loadError && <Button variant="outline" className="ml-3" onClick={() => void load()}>Retry</Button>}</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Operational runbook"
        description="Track readiness checks, dependencies, and retention/release gates."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Operational runbook" }]}
        sticky
        showCommandHint
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Retention job</CardTitle>
            <CardDescription>Preview records older than your approved retention policy. Deletion is permanent and requires explicit confirmation. This does not verify infrastructure backups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4"><div className="flex flex-wrap items-center gap-3">
            <Input aria-label="Audit retention days" type="number" min={1} step={1} value={retentionDays} onChange={(event) => { setRetentionDays(event.target.value); setPreview(null); setConfirmation(""); }} className="w-40" />
            <Button variant="outline" disabled={retentionBusy || !Number.isInteger(Number(retentionDays)) || Number(retentionDays) < 1} onClick={async () => { setRetentionBusy(true); setPreview(null); try { setPreview(await previewRetentionJobApi(Number(retentionDays))); } catch (error) { toast.error(error instanceof Error ? error.message : "Preview unavailable. Deploy the matching backend."); } finally { setRetentionBusy(false); } }}>{retentionBusy ? "Checking…" : "Preview retention"}</Button>
            <span className="text-xs text-muted-foreground">Last run: {state.retention.lastRunAt ? new Date(state.retention.lastRunAt).toLocaleString() : "—"} · {state.retention.status}</span></div>
            {preview && <div className="max-w-2xl space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"><p className="text-sm"><strong>{preview.eligibleCount.toLocaleString()} records</strong> are eligible before {new Date(preview.cutoff).toLocaleString()}. Minimum retention: {preview.minimumDays.toLocaleString()} days.</p><p className="text-xs text-muted-foreground">Review your archival evidence and retention policy first. Type DELETE AUDIT HISTORY to confirm this deletion. The preview expires after five minutes.</p><Input aria-label="Confirm permanent audit deletion" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE AUDIT HISTORY" /><Button variant="destructive" disabled={retentionBusy || preview.eligibleCount === 0 || confirmation !== "DELETE AUDIT HISTORY"} onClick={async () => { setRetentionBusy(true); try { const result = await runRetentionJobApi(preview, confirmation); toast.success(`Retention complete. Deleted ${result.deletedCount} records.`); setPreview(null); setConfirmation(""); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : "Retention could not run. Preview again."); } finally { setRetentionBusy(false); } }}>Permanently delete reviewed history</Button></div>}
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
