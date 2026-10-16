"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DocumentHubUploadButton } from "@/components/documents/DocumentHubUploadButton";
import {
  clearHubCheque,
  confirmHubAllocation,
  confirmHubClassification,
  confirmHubPhysicalReceipt,
  createHubGroup,
  fetchDocumentHub,
  linkHubDocument,
  updateHubRule,
} from "@/lib/api/document-hub";
import type { DocumentHubStatus, ScannedDocument } from "@/lib/types/document-hub";
import { toast } from "sonner";

const QUEUES: Array<{ id: DocumentHubStatus | ""; label: string }> = [
  { id: "", label: "All" },
  { id: "awaiting_classification", label: "Awaiting classification" },
  { id: "matched", label: "Matched" },
  { id: "ready_for_approval", label: "Ready for approval" },
  { id: "auto_processed", label: "Auto-processed" },
  { id: "exceptions", label: "Exceptions" },
  { id: "unallocated_payments", label: "Unallocated payments" },
  { id: "completed", label: "Completed" },
];

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export default function DocumentHubPage() {
  const [status, setStatus] = React.useState<DocumentHubStatus | "">("");
  const [party, setParty] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Awaited<ReturnType<typeof fetchDocumentHub>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [groupName, setGroupName] = React.useState("");
  const [bankReference, setBankReference] = React.useState("");
  const [physical, setPhysical] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchDocumentHub({
        status: status || undefined,
        party: party || undefined,
        q: query || undefined,
      });
      setData(next);
      setSelectedId((current) => current && next.items.some((item) => item._id === current) ? current : next.items[0]?._id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the document hub.");
    } finally {
      setLoading(false);
    }
  }, [party, query, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selected = data?.items.find((item) => item._id === selectedId) ?? null;
  const counts = new Map((data?.counts ?? []).map((row) => [row._id, row.count]));

  const run = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The change was not saved.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Document Hub"
        description="Upload a scan without sorting it first. The hub reads what it can, suggests a match, and keeps the original file."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Document Hub" }]}
        actions={<DocumentHubUploadButton />}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {QUEUES.map((queue) => (
            <Button
              key={queue.id || "all"}
              type="button"
              size="sm"
              variant={status === queue.id ? "default" : "outline"}
              onClick={() => setStatus(queue.id)}
            >
              {queue.label}
              {queue.id ? ` (${counts.get(queue.id) ?? 0})` : ""}
            </Button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, number, or text" />
          <Input value={party} onChange={(event) => setParty(event.target.value)} placeholder="Supplier or customer" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <Card>
            <CardHeader>
              <CardTitle>{loading ? "Loading documents" : `${data?.items.length ?? 0} documents`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.items ?? []).map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left ${item._id === selectedId ? "border-primary" : ""}`}
                  onClick={() => setSelectedId(item._id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.fields.partyName || item.fileName}</span>
                    <Badge variant={item.flags.some((flag) => flag.severity === "critical") ? "destructive" : "secondary"}>
                      {labelize(item.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {labelize(item.documentType)} · {item.fields.documentNumber || "No number"} · {item.classificationSource === "user_confirmed" ? "Confirmed rule" : "Suggestion"}
                  </p>
                </button>
              ))}
              {!loading && (data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No documents in this queue. Scan a PDF or photo to start one.</p>
              ) : null}
            </CardContent>
          </Card>
          {selected ? (
            <Detail
              item={selected}
              groups={data?.groups ?? []}
              physical={physical}
              setPhysical={setPhysical}
              bankReference={bankReference}
              setBankReference={setBankReference}
              run={run}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Select a document to review its match, flags, and allocation.</CardContent>
            </Card>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Groups</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="New group or subgroup name" />
                <Button
                  type="button"
                  onClick={() => void run(async () => {
                    await createHubGroup(groupName);
                    setGroupName("");
                  }, "Group saved.")}
                >
                  Add
                </Button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {(data?.groups ?? []).map((group) => (
                  <li key={group._id}>{group.parentKey ? "– " : ""}{group.name}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Learned rules</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.rules ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Confirmed classifications show up here as proposed rules. An administrator confirms them before they change future documents.</p> : null}
              {(data?.rules ?? []).map((rule) => (
                <div key={rule._id} className="rounded-md border p-3 text-sm">
                  <p>{rule.partyName || "Any party"} → {labelize(rule.documentType)}</p>
                  <p className="text-muted-foreground">{rule.status} · {labelize(rule.mode)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { status: "confirmed" }), "Rule confirmed.")}>Confirm</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { mode: "suggest" }), "Rule will only suggest.")}>Suggest</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { mode: "draft" }), "Rule will prepare a draft.")}>Draft</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void run(() => updateHubRule(rule._id, { mode: "auto_post" }), "Eligible exact matches can be marked auto-processed. The ledger is still posted from the ERP document.")}>Auto-process</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Detail({
  item,
  groups,
  physical,
  setPhysical,
  bankReference,
  setBankReference,
  run,
}: {
  item: ScannedDocument;
  groups: Array<{ key: string; name: string }>;
  physical: Record<string, string>;
  setPhysical: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  bankReference: string;
  setBankReference: (value: string) => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [documentType, setDocumentType] = React.useState(item.documentType);
  const [groupKey, setGroupKey] = React.useState(item.groupKey);
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setDocumentType(item.documentType);
    setGroupKey(item.groupKey);
    setAmounts(Object.fromEntries((item.allocation?.lines ?? []).map((line) => [line.invoiceNumber, String(line.amount)])));
  }, [item]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.fileName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{item.ledgerPostingNote}</p>
        <p>Module {item.moduleKey}. Confidence {Math.round(item.confidence * 100)}%.</p>
        <dl className="grid grid-cols-2 gap-2">
          <Field label="Party" value={item.fields.partyName} />
          <Field label="Number" value={item.fields.documentNumber || item.fields.chequeNumber} />
          <Field label="Total" value={item.fields.total != null ? String(item.fields.total) : undefined} />
          <Field label="Tax PIN" value={item.fields.taxPin} />
        </dl>
        <div className="space-y-2">
          {item.flags.map((flag) => (
            <p key={`${flag.code}-${flag.message}`} className={flag.severity === "critical" ? "text-destructive" : "text-muted-foreground"}>
              {flag.severity}: {flag.message}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <p className="font-medium">Matches</p>
          {item.matches.length === 0 ? <p className="text-muted-foreground">No ERP transaction matched.</p> : null}
          {item.matches.map((match) => (
            <div key={match.candidateId} className="rounded-md border p-2">
              <p>{match.number} · {match.level} · {match.typeKey}</p>
              {match.reasons.map((reason) => <p key={reason} className="text-muted-foreground">{reason}</p>)}
              {match.differences.map((difference) => <p key={difference}>{difference}</p>)}
              <Button type="button" size="sm" className="mt-2" variant="outline" onClick={() => void run(() => linkHubDocument(item._id, match.typeKey, match.candidateId), "Original file attached. The stored copy was not duplicated.")}>
                Attach to {match.number}
              </Button>
            </div>
          ))}
        </div>
        {item.allocation ? (
          <div className="space-y-2">
            <p className="font-medium">Cheque allocation</p>
            <p>Face value {item.allocation.faceValue}. Allocated {item.allocation.allocated}. Unapplied {item.allocation.unapplied}.</p>
            {item.allocation.lines.map((line) => (
              <label key={line.invoiceNumber} className="flex items-center justify-between gap-2">
                <span>{line.invoiceNumber}</span>
                <Input
                  className="w-32"
                  value={amounts[line.invoiceNumber] ?? ""}
                  onChange={(event) => setAmounts((current) => ({ ...current, [line.invoiceNumber]: event.target.value }))}
                />
              </label>
            ))}
            <Button
              type="button"
              size="sm"
              onClick={() => void run(() => confirmHubAllocation(item._id, item.allocation!.lines.map((line) => ({
                invoiceId: line.invoiceId,
                invoiceNumber: line.invoiceNumber,
                amount: Number(amounts[line.invoiceNumber] ?? line.amount),
              }))), "Allocation saved. The cheque amount was left unchanged.")}
            >
              Save allocation
            </Button>
            {item.chequeLifecycle ? (
              <p className="text-muted-foreground">
                Receipt {item.chequeLifecycle.receipt}. Deposit {labelize(item.chequeLifecycle.bankDeposit)}. Clearing {labelize(item.chequeLifecycle.clearing)}. Reconciliation {labelize(item.chequeLifecycle.reconciliation)}.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Input value={bankReference} onChange={(event) => setBankReference(event.target.value)} placeholder="Bank confirmation reference" />
              <Button type="button" variant="outline" onClick={() => void run(() => clearHubCheque(item._id, bankReference), "Cheque marked cleared from the bank confirmation.")}>Clear</Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <p className="font-medium">Counted quantity</p>
          <p className="text-muted-foreground">Enter what was physically received. The delivery note quantity stays as the supplier{'\u2019'}s figure.</p>
          {(item.fields.lines.length ? item.fields.lines : [{ description: "Received goods" }]).map((line) => (
            <label key={line.description} className="flex items-center justify-between gap-2">
              <span>{line.description}{line.quantity != null ? ` · note ${line.quantity} ${line.uom ?? ""}` : ""}</span>
              <Input
                className="w-28"
                value={physical[`${item._id}:${line.description}`] ?? (line.physicalQuantity != null ? String(line.physicalQuantity) : "")}
                onChange={(event) => setPhysical((current) => ({ ...current, [`${item._id}:${line.description}`]: event.target.value }))}
              />
            </label>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void run(() => confirmHubPhysicalReceipt(item._id, (item.fields.lines.length ? item.fields.lines : [{ description: "Received goods" }]).map((line) => ({
              description: line.description,
              physicalQuantity: Number(physical[`${item._id}:${line.description}`] ?? line.physicalQuantity),
            }))), "Counted quantity saved.")}
          >
            Save counted quantity
          </Button>
        </div>
        <div className="space-y-2">
          <p className="font-medium">Classification</p>
          <select className="w-full rounded-md border bg-background p-2" value={groupKey} onChange={(event) => setGroupKey(event.target.value)}>
            {groups.map((group) => <option key={group.key} value={group.key}>{group.name}</option>)}
          </select>
          <Input value={documentType} onChange={(event) => setDocumentType(event.target.value)} />
          <Button type="button" size="sm" onClick={() => void run(() => confirmHubClassification(item._id, { documentType, groupKey, fields: { partyName: item.fields.partyName } }), "Classification confirmed. A proposed rule was saved for an administrator.")}>
            Confirm classification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
