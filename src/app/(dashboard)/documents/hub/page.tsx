"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { DocumentHubUploadButton } from "@/components/documents/DocumentHubUploadButton";
import { DocumentHubPreview } from "@/components/documents/DocumentHubPreview";
import {
  clearHubCheque,
  confirmHubAllocation,
  confirmHubClassification,
  confirmHubPhysicalReceipt,
  createHubGroup,
  deleteHubDocument,
  explainHubDocument,
  fetchDocumentHub,
  linkHubDocument,
  updateHubRule,
} from "@/lib/api/document-hub";
import type { DocumentHubStatus, HubFlag, ScannedDocument } from "@/lib/types/document-hub";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
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
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [readingFiles, setReadingFiles] = React.useState<string[]>([]);
  const [arrived, setArrived] = React.useState<{ id: string; count: number; name: string } | null>(null);
  const loadRequest = React.useRef(0);

  const load = React.useCallback(async (override?: {
    status?: DocumentHubStatus | "";
    party?: string;
    q?: string;
    selectId?: string;
  }) => {
    const nextStatus = override ? override.status ?? "" : status;
    const nextParty = override ? override.party ?? "" : party;
    const nextQuery = override ? override.q ?? "" : query;
    const requestId = ++loadRequest.current;
    setLoading(true);
    try {
      const next = await fetchDocumentHub({
        status: nextStatus || undefined,
        party: nextParty || undefined,
        q: nextQuery || undefined,
      });
      if (requestId !== loadRequest.current) return;
      setData(next);
      if (override) {
        setStatus(nextStatus);
        setParty(nextParty);
        setQuery(nextQuery);
      }
      setSelectedId((current) => {
        if (override?.selectId && next.items.some((item) => item._id === override.selectId)) return override.selectId;
        return current && next.items.some((item) => item._id === current) ? current : next.items[0]?._id ?? null;
      });
    } catch (error) {
      if (requestId !== loadRequest.current) return;
      toast.error(error instanceof Error ? error.message : "Could not load the document hub.");
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, [party, query, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selected = data?.items.find((item) => item._id === selectedId) ?? null;
  const counts = new Map((data?.counts ?? []).map((row) => [row._id, row.count]));
  const allCount = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const parents = (data?.groups ?? []).filter((group) => !group.parentKey);
  const childrenOf = (key: string) => (data?.groups ?? []).filter((group) => group.parentKey === key);

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
        actions={
          <DocumentHubUploadButton
            onPendingChange={setReadingFiles}
            onUploaded={async (result) => {
              const incoming = result.uploads.flatMap((upload) => upload.items);
              const first = incoming[0];
              if (!first) {
                toast.message("The file was stored, but nothing was added to the inbox.");
                return;
              }
              setArrived({
                id: first._id,
                count: incoming.length,
                name: first.fields.partyName || first.fileName,
              });
              setData((current) => {
                if (!current) return current;
                const ids = new Set(incoming.map((item) => item._id));
                const counts = new Map((current.counts ?? []).map((row) => [row._id, row.count]));
                for (const item of incoming) counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
                return {
                  ...current,
                  items: [...incoming, ...current.items.filter((item) => !ids.has(item._id))],
                  counts: [...counts.entries()].map(([_id, count]) => ({ _id, count })),
                };
              });
              setSelectedId(first._id);
              setStatus("");
              setParty("");
              setQuery("");
              await load({ status: "", party: "", q: "", selectId: first._id });
            }}
          />
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-xl border bg-card">
          <TableLinearProgress active={loading} />
          <div className="flex gap-1 overflow-x-auto p-1.5">
            {QUEUES.map((queue) => {
              const active = status === queue.id;
              const count = queue.id ? counts.get(queue.id) ?? 0 : allCount;
              return (
                <button
                  key={queue.id || "all"}
                  type="button"
                  onClick={() => setStatus(queue.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{queue.label}</span>
                  <span className={cn("tabular-nums text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, number, or text" />
          <Input value={party} onChange={(event) => setParty(event.target.value)} placeholder="Supplier or customer" />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="relative overflow-hidden">
            <TableLinearProgress active={loading} />
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Inbox</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-1.5 p-4 pt-2 transition-opacity duration-200", loading && !readingFiles.length && "opacity-60")}>
              {arrived ? (
                <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5">
                  <p className="text-sm font-medium">
                    {arrived.count === 1 ? "Ready" : `${arrived.count} documents ready`}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {arrived.name} is open below.
                  </p>
                </div>
              ) : null}
              {readingFiles.map((name) => (
                <div key={name} className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
                  <p className="truncate text-sm font-medium">Reading {name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">It will show here when the read finishes.</p>
                </div>
              ))}
              {(data?.items ?? []).map((item) => {
                const critical = item.flags.some((flag) => flag.severity === "critical");
                const selectedRow = item._id === selectedId;
                return (
                  <div
                    key={item._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(item._id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedId(item._id);
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selectedRow ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                      arrived?.id === item._id && "ring-2 ring-primary/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.fields.partyName || item.fileName}</p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {labelize(item.documentType)}
                          <span className="px-1.5">·</span>
                          {item.fields.documentNumber || item.fields.chequeNumber || "No number"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={critical ? "destructive" : "secondary"} className="capitalize">
                          {labelize(item.status)}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-muted-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDelete({ id: item._id, name: item.fields.partyName || item.fileName });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && !readingFiles.length && (data?.items.length ?? 0) === 0 ? (
                <p className="px-1 py-8 text-center text-sm text-muted-foreground">No documents in this queue. Scan a PDF or photo to start one.</p>
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
              onDelete={() => setPendingDelete({ id: selected._id, name: selected.fields.partyName || selected.fileName })}
              run={run}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-sm text-muted-foreground">Select a document to review its preview, summary, match, and allocation.</CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              <div className="flex gap-2">
                <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="New group or subgroup name" />
                <Button
                  type="button"
                  onClick={() => void run(async () => {
                    await createHubGroup(groupName);
                    setGroupName("");
                  }, "Group saved.")}
                  disabled={!groupName.trim()}
                >
                  Add
                </Button>
              </div>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {parents.map((group) => (
                  <div key={group._id}>
                    <p className="text-sm font-medium">{group.name}</p>
                    <ul className="mt-1 space-y-0.5 border-l pl-3 text-sm text-muted-foreground">
                      {childrenOf(group.key).map((child) => (
                        <li key={child._id}>{child.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Learned rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              {(data?.rules ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Confirmed classifications show up here as proposed rules. An administrator confirms them before they change future documents.</p>
              ) : null}
              {(data?.rules ?? []).map((rule) => (
                <div key={rule._id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{rule.partyName || "Any party"}</p>
                  <p className="text-muted-foreground">{labelize(rule.documentType)} · {rule.status} · {labelize(rule.mode)}</p>
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
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete ? `Delete “${pendingDelete.name}”?` : "Delete this file?"}
        description="This removes the file from Document Hub. The stored original is deleted when nothing else still uses it."
        confirmLabel="Delete"
        cancelLabel="Keep file"
        variant="destructive"
        onConfirm={() => {
          if (!pendingDelete) return;
          void run(() => deleteHubDocument(pendingDelete.id), "File deleted.");
        }}
      />
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
  onDelete,
  run,
}: {
  item: ScannedDocument;
  groups: Array<{ key: string; name: string }>;
  physical: Record<string, string>;
  setPhysical: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  bankReference: string;
  setBankReference: (value: string) => void;
  onDelete: () => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [documentType, setDocumentType] = React.useState(item.documentType);
  const [groupKey, setGroupKey] = React.useState(item.groupKey);
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const lines = item.fields.lines.length ? item.fields.lines : [{ description: "Received goods" }];

  React.useEffect(() => {
    setDocumentType(item.documentType);
    setGroupKey(item.groupKey);
    setAmounts(Object.fromEntries((item.allocation?.lines ?? []).map((line) => [line.invoiceNumber, String(line.amount)])));
  }, [item]);

  return (
    <Card>
      <CardHeader className="space-y-1 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{item.fields.partyName || item.fileName}</CardTitle>
            <p className="truncate text-sm text-muted-foreground">{item.fileName}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 pt-2 text-sm">
        <DocumentHubPreview fileId={item.fileId} fileName={item.fileName} contentType={item.contentType} fileUrl={item.fileUrl} />
        <DocumentSummary documentId={item._id} />
        <p className="text-muted-foreground">{item.ledgerPostingNote}</p>
        <dl className="grid grid-cols-2 gap-3">
          <Field label="Type" value={labelize(item.documentType)} />
          <Field label="Confidence" value={`${Math.round(item.confidence * 100)}%`} />
          <Field label="Number" value={item.fields.documentNumber || item.fields.chequeNumber} />
          <Field label="Total" value={item.fields.total != null ? formatMoney(item.fields.total, item.fields.currency || "KES") : undefined} />
          <Field label="Tax PIN" value={item.fields.taxPin} />
          <Field label="Classification" value={item.classificationSource === "user_confirmed" ? "Confirmed rule" : "Suggestion"} />
          <Field label="Read with" value={item.ocrSource === "document-ai" ? "Document AI" : item.ocrSource === "text-layer" ? "Text in the file" : "Not read yet"} />
        </dl>
        {item.flags.length ? (
          <Section title="Exceptions">
            <div className="space-y-2">
              {item.flags.map((flag) => (
                <FlagNote key={`${flag.code}-${flag.message}`} flag={flag} />
              ))}
            </div>
          </Section>
        ) : null}
        <Section title="Matches">
          {item.matches.length === 0 ? <p className="text-muted-foreground">No ERP transaction matched.</p> : null}
          <div className="space-y-2">
            {item.matches.map((match) => (
              <div key={match.candidateId} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{match.number}</p>
                  <Badge variant="outline" className="capitalize">{match.level}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{labelize(match.typeKey)}</p>
                {match.reasons.map((reason) => <p key={reason} className="mt-1 text-muted-foreground">{reason}</p>)}
                {match.differences.map((difference) => <p key={difference} className="mt-1">{difference}</p>)}
                <Button type="button" size="sm" className="mt-3" variant="outline" onClick={() => void run(() => linkHubDocument(item._id, match.typeKey, match.candidateId), "Original file attached. The stored copy was not duplicated.")}>
                  Attach to {match.number}
                </Button>
              </div>
            ))}
          </div>
        </Section>
        {item.allocation ? (
          <Section title="Cheque allocation">
            <div className="grid grid-cols-3 gap-2 rounded-lg border p-3">
              <Field label="Face value" value={formatMoney(item.allocation.faceValue, item.fields.currency || "KES")} />
              <Field label="Allocated" value={formatMoney(item.allocation.allocated, item.fields.currency || "KES")} />
              <Field label="Unapplied" value={formatMoney(item.allocation.unapplied, item.fields.currency || "KES")} />
            </div>
            <div className="space-y-2">
              {item.allocation.lines.map((line) => (
                <label key={line.invoiceNumber} className="flex items-center justify-between gap-3">
                  <span>{line.invoiceNumber}</span>
                  <Input
                    className="w-32 tabular-nums"
                    value={amounts[line.invoiceNumber] ?? ""}
                    onChange={(event) => setAmounts((current) => ({ ...current, [line.invoiceNumber]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
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
          </Section>
        ) : null}
        <Section title="Counted quantity">
          <p className="text-muted-foreground">Enter what was physically received. The delivery note quantity stays as the supplier{"\u2019"}s figure.</p>
          {lines.map((line) => (
            <label key={line.description} className="flex items-center justify-between gap-3">
              <span>{line.description}{line.quantity != null ? ` · note ${line.quantity} ${line.uom ?? ""}` : ""}</span>
              <Input
                className="w-28 tabular-nums"
                value={physical[`${item._id}:${line.description}`] ?? (line.physicalQuantity != null ? String(line.physicalQuantity) : "")}
                onChange={(event) => setPhysical((current) => ({ ...current, [`${item._id}:${line.description}`]: event.target.value }))}
              />
            </label>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void run(() => confirmHubPhysicalReceipt(item._id, lines.map((line) => ({
              description: line.description,
              physicalQuantity: Number(physical[`${item._id}:${line.description}`] ?? line.physicalQuantity),
            }))), "Counted quantity saved.")}
          >
            Save counted quantity
          </Button>
        </Section>
        <Section title="Classification">
          <select className="h-10 w-full rounded-md border bg-background px-3" value={groupKey} onChange={(event) => setGroupKey(event.target.value)}>
            {groups.map((group) => <option key={group.key} value={group.key}>{group.name}</option>)}
          </select>
          <Input value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label="Document type" />
          <Button type="button" size="sm" onClick={() => void run(() => confirmHubClassification(item._id, { documentType, groupKey, fields: { partyName: item.fields.partyName } }), "Classification confirmed. A proposed rule was saved for an administrator.")}>
            Confirm classification
          </Button>
        </Section>
      </CardContent>
    </Card>
  );
}

function DocumentSummary({ documentId }: { documentId: string }) {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<"copilot" | "fields" | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary(null);
    void explainHubDocument(documentId)
      .then((result) => {
        if (cancelled) return;
        setSummary(result.summary);
        setSource(result.source);
      })
      .catch(() => {
        if (!cancelled) setSummary("A summary could not be written for this file.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted/30 p-3">
      <TableLinearProgress active={loading} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{source === "fields" ? "Summary" : "Copilot"}</p>
      <p className={cn("mt-1 leading-relaxed transition-opacity duration-200", loading && "opacity-60")}>
        {summary ?? "Reading the file…"}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function FlagNote({ flag }: { flag: HubFlag }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2",
        flag.severity === "critical" && "border-destructive/40 bg-destructive/5 text-destructive",
        flag.severity === "warning" && "border-amber-500/40 bg-amber-500/5",
        flag.severity === "information" && "text-muted-foreground",
      )}
    >
      <span className="mr-2 text-xs uppercase tracking-wide">{flag.severity}</span>
      {flag.message}
    </p>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium tabular-nums">{value || "—"}</dd>
    </div>
  );
}
