"use client";
import * as React from "react";
import { apiRequest } from "@/lib/api/client";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
type Policy = { requireSupplierInvoiceBeforeReceipt: boolean; holdLotControlledMaterialsForQc: boolean };
export default function ReceivingPolicyPage() {
  const canEdit = useHasPermission("admin.settings");
  const [policy, setPolicy] = React.useState<Policy | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => { void apiRequest<Policy>("/api/settings/receiving-policy").then(setPolicy).catch((e) => setError(e instanceof Error ? e.message : "Could not load receiving policy.")); }, []);
  return <PageShell><PageHeader title="Receiving policy" description="Control supplier invoice timing and quality release for incoming materials." />
    <div className="max-w-2xl space-y-6 p-6">{error && <p role="alert" className="text-destructive">{error}</p>}{policy && <>
      <label className="flex gap-3"><Checkbox disabled={!canEdit} checked={policy.requireSupplierInvoiceBeforeReceipt} onCheckedChange={(value) => setPolicy({ ...policy, requireSupplierInvoiceBeforeReceipt: value === true })} /><span>Require the supplier invoice before receiving goods. When off, receipt and GRNI can precede the invoice.</span></label>
      <label className="flex gap-3"><Checkbox disabled={!canEdit} checked={policy.holdLotControlledMaterialsForQc} onCheckedChange={(value) => setPolicy({ ...policy, holdLotControlledMaterialsForQc: value === true })} /><span>Hold lot-controlled materials for QC. Receiving warehouses must support QC before these receipts post.</span></label>
      {canEdit && <Button disabled={busy} onClick={async () => { setBusy(true); try { await apiRequest("/api/settings/receiving-policy", { method: "PATCH", body: policy }); toast.success("Receiving policy saved."); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save policy."); } finally { setBusy(false); } }}>Save receiving policy</Button>}
    </>}</div></PageShell>;
}
