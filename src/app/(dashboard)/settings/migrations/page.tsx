"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  downloadImportTemplateApi,
  exportCustomersCsvApi,
  exportProductPackagingCsvApi,
  exportProductsCsvApi,
  exportProductVariantsCsvApi,
  exportSuppliersCsvApi,
  importPartiesApi,
  importProductPackagingApi,
  importProductsApi,
  importProductVariantsApi,
  isImportExportAvailable,
} from "@/lib/api/import-export";
import {
  approveImportStageRecordApi,
  createImportRunApi,
  fetchImportReconciliationDashboardApi,
  fetchImportRunApi,
  fetchImportRunBatchesApi,
  fetchImportRunErrorsApi,
  fetchImportRunStageRecordsApi,
  fetchImportRunsApi,
  resolveImportStageRecordApi,
  retryImportStageRecordApi,
} from "@/lib/api/import-migrations";
import type {
  CreateImportRunInput,
  ImportBatchRow,
  ImportConflictResolution,
  ImportProvider,
  ImportReconciliationDashboard,
  ImportRowErrorRow,
  ImportRunRow,
  ImportStageRecordRow,
} from "@/lib/types/import-migrations";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SAMPLE_PAYLOADS: Record<ImportProvider, string> = {
  ZOHO_BOOKS: JSON.stringify(
    {
      contacts: [
        {
          contact_id: "123",
          contact_name: "Acme Retail",
          contact_number: "C-001",
          email: "ops@acme.com",
          phone: "+254700000000",
          contact_type: "customer",
        },
      ],
      items: [
        {
          item_id: "456",
          name: "Premium Flour 2kg",
          sku: "FLOUR-2KG",
          category_name: "Flour",
          brand: "Bakex",
          rate: 4.5,
          unit: "EA",
        },
      ],
    },
    null,
    2
  ),
  QUICKBOOKS: JSON.stringify(
    {
      customers: [{ Id: "1", DisplayName: "Acme Retail", Active: true }],
      vendors: [{ Id: "2", DisplayName: "Global Milling", Active: true }],
      items: [{ Id: "3", Name: "Premium Flour 2kg", Sku: "FLOUR-2KG", UnitPrice: 4.5, Active: true }],
    },
    null,
    2
  ),
  SAP_B1: JSON.stringify(
    {
      businessPartners: [{ CardCode: "C2000", CardName: "Acme Retail", CardType: "C", Valid: "tYES" }],
      items: [{ ItemCode: "FLOUR-2KG", ItemName: "Premium Flour 2kg", InventoryUOM: "EA", Valid: "tYES" }],
    },
    null,
    2
  ),
};

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatPrettyJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  if (["COMPLETED", "IMPORTED"].includes(status)) return "success";
  if (["RUNNING", "VALIDATED", "DRY_RUN"].includes(status)) return "info";
  if (["CONFLICT", "COMPLETED_WITH_ERRORS"].includes(status)) return "warning";
  if (["FAILED"].includes(status)) return "danger";
  return "default";
}

export default function MigrationConsolePage() {
  const [provider, setProvider] = React.useState<ImportProvider>("ZOHO_BOOKS");
  const [dryRun, setDryRun] = React.useState(true);
  const [profileId, setProfileId] = React.useState("");
  const [payloadText, setPayloadText] = React.useState(SAMPLE_PAYLOADS.ZOHO_BOOKS);
  const [sourceMetaText, setSourceMetaText] = React.useState("{\n  \"source\": \"manual-console\"\n}");
  const [submitting, setSubmitting] = React.useState(false);

  const [runs, setRuns] = React.useState<ImportRunRow[]>([]);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [selectedRun, setSelectedRun] = React.useState<ImportRunRow | null>(null);
  const [batches, setBatches] = React.useState<ImportBatchRow[]>([]);
  const [errors, setErrors] = React.useState<ImportRowErrorRow[]>([]);
  const [stageRecords, setStageRecords] = React.useState<ImportStageRecordRow[]>([]);
  const [dashboard, setDashboard] = React.useState<ImportReconciliationDashboard | null>(null);
  const [loadingRuns, setLoadingRuns] = React.useState(true);
  const [loadingRunDetails, setLoadingRunDetails] = React.useState(false);
  const [actioningRecordId, setActioningRecordId] = React.useState<string | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = React.useState<Record<string, ImportConflictResolution>>({});
  const [matchedEntityDrafts, setMatchedEntityDrafts] = React.useState<Record<string, string>>({});
  const [csvImportType, setCsvImportType] = React.useState<
    "customers" | "suppliers" | "products" | "product-packaging" | "product-variants"
  >("customers");
  const [csvImportFile, setCsvImportFile] = React.useState<File | null>(null);
  const [csvImporting, setCsvImporting] = React.useState(false);
  const csvImportInputRef = React.useRef<HTMLInputElement>(null);

  const conflictRecords = React.useMemo(
    () =>
      stageRecords.filter(
        (record) =>
          record.status === "CONFLICT" ||
          record.proposedAction === "CONFLICT" ||
          record.status === "VALIDATED"
      ),
    [stageRecords]
  );

  const loadRuns = React.useCallback(async () => {
    setLoadingRuns(true);
    try {
      const items = await fetchImportRunsApi();
      setRuns(items);
      if (!selectedRunId && items[0]) {
        setSelectedRunId(items[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load import runs.");
    } finally {
      setLoadingRuns(false);
    }
  }, [selectedRunId]);

  const loadDashboard = React.useCallback(async () => {
    try {
      setDashboard(await fetchImportReconciliationDashboardApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reconciliation dashboard.");
    }
  }, []);

  const loadRunDetails = React.useCallback(async (runId: string) => {
    setLoadingRunDetails(true);
    try {
      const [run, runBatches, runErrors, runStageRecords] = await Promise.all([
        fetchImportRunApi(runId),
        fetchImportRunBatchesApi(runId),
        fetchImportRunErrorsApi(runId),
        fetchImportRunStageRecordsApi(runId),
      ]);
      setSelectedRun(run);
      setBatches(runBatches);
      setErrors(runErrors);
      setStageRecords(runStageRecords);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load import run details.");
    } finally {
      setLoadingRunDetails(false);
    }
  }, []);

  React.useEffect(() => {
    void Promise.all([loadRuns(), loadDashboard()]);
  }, [loadRuns, loadDashboard]);

  React.useEffect(() => {
    if (!selectedRunId) return;
    void loadRunDetails(selectedRunId);
  }, [selectedRunId, loadRunDetails]);

  const refreshSelectedRun = React.useCallback(async () => {
    if (!selectedRunId) return;
    await Promise.all([loadRuns(), loadDashboard(), loadRunDetails(selectedRunId)]);
  }, [loadDashboard, loadRunDetails, loadRuns, selectedRunId]);

  const submitRun = async () => {
    let payload: Record<string, unknown>;
    let sourceMeta: Record<string, unknown> | undefined;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      toast.error("Payload JSON is invalid.");
      return;
    }
    try {
      sourceMeta = sourceMetaText.trim() ? (JSON.parse(sourceMetaText) as Record<string, unknown>) : undefined;
    } catch {
      toast.error("Source metadata JSON is invalid.");
      return;
    }

    const input: CreateImportRunInput = {
      provider,
      dryRun,
      profileId: profileId.trim() || undefined,
      payload,
      sourceMeta,
    };

    setSubmitting(true);
    try {
      const run = await createImportRunApi(input);
      setSelectedRunId(run.id);
      toast.success(dryRun ? "Dry-run import completed." : "Import run completed.");
      await Promise.all([loadRuns(), loadDashboard(), loadRunDetails(run.id)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to execute import run.");
    } finally {
      setSubmitting(false);
    }
  };

  const getResolutionDraft = React.useCallback((record: ImportStageRecordRow): ImportConflictResolution => {
    return (
      resolutionDrafts[record.id] ??
      (record.proposedAction === "UPDATE"
        ? "USE_EXISTING"
        : record.proposedAction === "SKIP"
          ? "SKIP"
          : "CREATE_NEW")
    );
  }, [resolutionDrafts]);

  const getMatchedEntityDraft = React.useCallback(
    (record: ImportStageRecordRow): string => matchedEntityDrafts[record.id] ?? record.matchedEntityId ?? "",
    [matchedEntityDrafts]
  );

  const handleResolve = async (record: ImportStageRecordRow) => {
    const resolution = getResolutionDraft(record);
    const matchedEntityId = getMatchedEntityDraft(record).trim();
    if (resolution === "USE_EXISTING" && !matchedEntityId) {
      toast.error("Provide a canonical entity ID before using the existing-record resolution.");
      return;
    }

    setActioningRecordId(record.id);
    try {
      await resolveImportStageRecordApi({
        id: record.id,
        resolution,
        matchedEntityId: resolution === "USE_EXISTING" ? matchedEntityId : undefined,
      });
      toast.success("Conflict resolution saved.");
      await refreshSelectedRun();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resolve staged record.");
    } finally {
      setActioningRecordId(null);
    }
  };

  const handleApprove = async (record: ImportStageRecordRow) => {
    setActioningRecordId(record.id);
    try {
      await approveImportStageRecordApi(record.id);
      toast.success("Stage record approved.");
      await refreshSelectedRun();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve staged record.");
    } finally {
      setActioningRecordId(null);
    }
  };

  const handleRetry = async (record: ImportStageRecordRow) => {
    setActioningRecordId(record.id);
    try {
      await retryImportStageRecordApi(record.id);
      toast.success("Stage record retried.");
      await refreshSelectedRun();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry staged record.");
    } finally {
      setActioningRecordId(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Migration Console"
        description="Run dry-runs, review conflicts, and reconcile migrations from Zoho Books, QuickBooks, and SAP Business One."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Migration Console" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void Promise.all([loadRuns(), loadDashboard()])}>
              <Icons.RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={submitRun} disabled={submitting}>
              <Icons.Play className="mr-2 h-4 w-4" />
              {submitting ? "Running..." : dryRun ? "Run dry-run" : "Run import"}
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <CardHeader>
              <CardTitle>Start import run</CardTitle>
              <CardDescription>
                Normalize provider payloads into canonical OdaFlow masters. Dry-run is recommended before any committed import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(value) => {
                      const next = value as ImportProvider;
                      setProvider(next);
                      setPayloadText(SAMPLE_PAYLOADS[next]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZOHO_BOOKS">Zoho Books</SelectItem>
                      <SelectItem value="QUICKBOOKS">QuickBooks</SelectItem>
                      <SelectItem value="SAP_B1">SAP Business One</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mapping profile ID</Label>
                  <Input
                    value={profileId}
                    onChange={(event) => setProfileId(event.target.value)}
                    placeholder="Optional profile id"
                  />
                </div>
                <div className="flex items-end gap-3 rounded-lg border p-3">
                  <Checkbox id="dry-run" checked={dryRun} onCheckedChange={(checked) => setDryRun(checked === true)} />
                  <div className="space-y-1">
                    <Label htmlFor="dry-run">Dry-run only</Label>
                    <p className="text-xs text-muted-foreground">Preview staging, matching, and conflicts without writing canonical masters.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Provider payload</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPayloadText(SAMPLE_PAYLOADS[provider])}>
                      Load sample
                    </Button>
                  </div>
                </div>
                <textarea
                  className="min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="space-y-2">
                <Label>Source metadata</Label>
                <textarea
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  value={sourceMetaText}
                  onChange={(event) => setSourceMetaText(event.target.value)}
                  spellCheck={false}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest runs</CardTitle>
              <CardDescription>Pick a run to inspect staged records, conflicts, and reconciliation details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingRuns ? (
                <p className="text-sm text-muted-foreground">Loading import runs...</p>
              ) : runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No import runs yet.</p>
              ) : (
                <div className="space-y-2">
                  {runs.slice(0, 8).map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/40 ${selectedRunId === run.id ? "border-primary bg-muted/40" : ""}`}
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{run.provider}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(run.startedAt)}</p>
                        </div>
                        <StatusBadge status={run.status} variant={getStatusVariant(run.status)} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{run.summary.totalRecords} records</span>
                        <span>{run.summary.created} created</span>
                        <span>{run.summary.updated} updated</span>
                        <span>{run.summary.conflicted} conflicts</span>
                        <span>{run.dryRun ? "Dry-run" : "Committed"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="preview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="preview">Dry-run preview</TabsTrigger>
            <TabsTrigger value="conflicts">Conflict review</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            <TabsTrigger value="csv">CSV Import / Export</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Selected run</CardTitle>
                  <CardDescription>Summary, dependency order, and entity scope for the current run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedRun ? (
                    <p className="text-sm text-muted-foreground">Select an import run to review it.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold">{selectedRun.provider}</p>
                          <p className="text-sm text-muted-foreground">{formatDateTime(selectedRun.startedAt)}</p>
                        </div>
                        <StatusBadge status={selectedRun.status} variant={getStatusVariant(selectedRun.status)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Records</p>
                          <p className="text-xl font-semibold">{selectedRun.summary.totalRecords}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Mode</p>
                          <p className="text-xl font-semibold">{selectedRun.dryRun ? "Dry-run" : "Commit"}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-xl font-semibold">{selectedRun.summary.created}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Updated</p>
                          <p className="text-xl font-semibold">{selectedRun.summary.updated}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Conflicts</p>
                          <p className="text-xl font-semibold">{selectedRun.summary.conflicted}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Failed</p>
                          <p className="text-xl font-semibold">{selectedRun.summary.failed}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Dependency plan</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRun.dependencyPlan.map((step) => (
                            <Badge key={step} variant="outline">{step}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Entity types in run</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRun.entityTypes.map((step) => (
                            <Badge key={step}>{step}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Batch execution</CardTitle>
                  <CardDescription>Ordered batches reflect dependency-aware import execution.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingRunDetails ? (
                    <div className="p-6 text-sm text-muted-foreground">Loading run details...</div>
                  ) : batches.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No batches for this run.</div>
                  ) : (
                    <ScrollArea className="max-h-[420px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b text-left">
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Entity</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Summary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map((batch) => (
                            <tr key={batch.id} className="border-b align-top">
                              <td className="px-4 py-3">{batch.dependencyOrder}</td>
                              <td className="px-4 py-3 font-medium">{batch.entityType}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={batch.status} variant={getStatusVariant(batch.status)} />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {batch.summary.totalRecords} total · {batch.summary.created} created · {batch.summary.updated} updated · {batch.summary.conflicted} conflicts · {batch.summary.failed} failed
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Staged records</CardTitle>
                <CardDescription>Review normalized payloads, proposed actions, and duplicate-match reasons before a live import.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stageRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staged records available for this run.</p>
                ) : (
                  <div className="space-y-3">
                    {stageRecords.slice(0, 25).map((record) => (
                      <div key={record.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {record.entityType} · row {record.rowNumber}
                              {record.externalId ? ` · ${record.externalId}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Proposed action: {record.proposedAction ?? "—"}
                              {record.matchReason ? ` · Match reason: ${record.matchReason}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={record.status} variant={getStatusVariant(record.status)} />
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Normalized payload</p>
                            <pre className="max-h-52 overflow-auto rounded-md bg-muted p-3 text-xs">{formatPrettyJson(record.normalizedPayload)}</pre>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Source payload</p>
                            <pre className="max-h-52 overflow-auto rounded-md bg-muted p-3 text-xs">{formatPrettyJson(record.sourcePayload)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Conflict candidates</CardTitle>
                  <CardDescription>Rows that matched multiple canonical records or could not be safely resolved.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {conflictRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No conflicts for the selected run.</p>
                  ) : (
                    conflictRecords.map((record) => (
                      <div key={record.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {record.entityType} · row {record.rowNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.externalId ?? "No external ID"} · {record.matchReason ?? "Conflict requires review"}
                            </p>
                          </div>
                          <StatusBadge
                            status={record.status}
                            variant={record.status === "VALIDATED" ? "info" : "warning"}
                          />
                        </div>
                        <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {formatPrettyJson(record.normalizedPayload)}
                        </pre>
                        <div className="mt-3 grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                          <div className="space-y-2">
                            <Label>Resolution</Label>
                            <Select
                              value={getResolutionDraft(record)}
                              onValueChange={(value) =>
                                setResolutionDrafts((current) => ({
                                  ...current,
                                  [record.id]: value as ImportConflictResolution,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose resolution" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CREATE_NEW">Create new canonical record</SelectItem>
                                <SelectItem value="USE_EXISTING">Link to existing canonical record</SelectItem>
                                <SelectItem value="SKIP">Skip this imported row</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Matched canonical entity ID</Label>
                            <Input
                              value={getMatchedEntityDraft(record)}
                              onChange={(event) =>
                                setMatchedEntityDrafts((current) => ({
                                  ...current,
                                  [record.id]: event.target.value,
                                }))
                              }
                              placeholder="Required when linking to an existing record"
                              disabled={getResolutionDraft(record) !== "USE_EXISTING"}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleResolve(record)}
                            disabled={actioningRecordId === record.id}
                          >
                            <Icons.CheckCircle2 className="mr-2 h-4 w-4" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleApprove(record)}
                            disabled={
                              actioningRecordId === record.id ||
                              !(record.status === "VALIDATED" || record.proposedAction === "SKIP")
                            }
                          >
                            <Icons.ShieldCheck className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleRetry(record)}
                            disabled={actioningRecordId === record.id}
                          >
                            <Icons.RefreshCcw className="mr-2 h-4 w-4" />
                            Retry auto-match
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Row errors</CardTitle>
                  <CardDescription>Validation and duplicate-resolution issues captured during staging.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {errors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No row errors for the selected run.</p>
                  ) : (
                    errors.map((error) => (
                      <div key={error.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{error.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {error.entityType} · row {error.rowNumber} · {formatDateTime(error.createdAt)}
                            </p>
                          </div>
                          <Badge variant={error.severity === "error" ? "destructive" : "outline"}>{error.severity}</Badge>
                        </div>
                        <p className="mt-2 text-sm">{error.message}</p>
                        {error.details ? (
                          <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                            {formatPrettyJson(error.details)}
                          </pre>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {(dashboard?.byProvider ?? []).map((providerSummary) => (
                <Card key={providerSummary.provider}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{providerSummary.provider}</CardTitle>
                    <CardDescription>{providerSummary.runs} recent run(s)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div>{providerSummary.created} created</div>
                    <div>{providerSummary.updated} updated</div>
                    <div>{providerSummary.conflicted} conflicts</div>
                    <div>{providerSummary.failed} failed</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Recent runs</CardTitle>
                  <CardDescription>Use this to audit migration activity and provider health over time.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {!dashboard || dashboard.runs.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No completed migration runs yet.</div>
                  ) : (
                    <ScrollArea className="max-h-[420px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b text-left">
                            <th className="px-4 py-3">Provider</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Started</th>
                            <th className="px-4 py-3">Summary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.runs.map((run) => (
                            <tr key={run.id} className="border-b">
                              <td className="px-4 py-3 font-medium">{run.provider}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={run.status} variant={getStatusVariant(run.status)} />
                              </td>
                              <td className="px-4 py-3">{formatDateTime(run.startedAt)}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {run.summary.totalRecords} total · {run.summary.created} created · {run.summary.updated} updated · {run.summary.failed} failed
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent errors</CardTitle>
                  <CardDescription>The latest validation or reconciliation issues across providers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!dashboard || dashboard.recentErrors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent import errors.</p>
                  ) : (
                    dashboard.recentErrors.map((error) => (
                      <div key={error.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{error.code}</p>
                          <Badge variant={error.severity === "error" ? "destructive" : "outline"}>{error.severity}</Badge>
                        </div>
                        <p className="mt-1 text-sm">{error.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {error.entityType} · row {error.rowNumber}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Export masters</CardTitle>
                  <CardDescription>
                    Download products, packaging, variants, customers, or suppliers as CSV. Use for backup or migration. Import products before packaging/variants.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!isImportExportAvailable() ? (
                    <p className="text-sm text-muted-foreground">Set NEXT_PUBLIC_API_URL to use export.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportProductsCsvApi((msg) => toast.error(msg))}
                      >
                        <Icons.Download className="mr-2 h-4 w-4" />
                        Export products
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportProductPackagingCsvApi((msg) => toast.error(msg))}
                      >
                        <Icons.Download className="mr-2 h-4 w-4" />
                        Export packaging
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportProductVariantsCsvApi((msg) => toast.error(msg))}
                      >
                        <Icons.Download className="mr-2 h-4 w-4" />
                        Export variants
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportCustomersCsvApi((msg) => toast.error(msg))}
                      >
                        <Icons.Download className="mr-2 h-4 w-4" />
                        Export customers
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportSuppliersCsvApi((msg) => toast.error(msg))}
                      >
                        <Icons.Download className="mr-2 h-4 w-4" />
                        Export suppliers
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Import from CSV</CardTitle>
                  <CardDescription>
                    Add customers, suppliers, products, packaging, or variants via CSV. Download a template for required fields. Import products before packaging/variants.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isImportExportAvailable() ? (
                    <p className="text-sm text-muted-foreground">Set NEXT_PUBLIC_API_URL to use import.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Entity type</Label>
                        <Select value={csvImportType} onValueChange={(v) => setCsvImportType(v as typeof csvImportType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customers">Customers</SelectItem>
                            <SelectItem value="suppliers">Suppliers</SelectItem>
                            <SelectItem value="products">Products</SelectItem>
                            <SelectItem value="product-packaging">Product packaging</SelectItem>
                            <SelectItem value="product-variants">Product variants</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadImportTemplateApi(csvImportType, (msg) => toast.error(msg))}
                        >
                          <Icons.FileDown className="mr-2 h-4 w-4" />
                          Download template
                        </Button>
                        <input
                          ref={csvImportInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => setCsvImportFile(e.target.files?.[0] ?? null)}
                        />
                        <Button
                          size="sm"
                          disabled={!csvImportFile || csvImporting}
                          onClick={async () => {
                            if (!csvImportFile) {
                              csvImportInputRef.current?.click();
                              return;
                            }
                            setCsvImporting(true);
                            try {
                              if (csvImportType === "products") {
                                const res = await importProductsApi(csvImportFile);
                                toast.success(`Imported ${res.imported} product(s).`);
                              } else if (csvImportType === "product-packaging") {
                                const res = await importProductPackagingApi(csvImportFile);
                                toast.success(`Imported ${res.imported} packaging row(s).`);
                              } else if (csvImportType === "product-variants") {
                                const res = await importProductVariantsApi(csvImportFile);
                                toast.success(`Imported ${res.imported} variant(s).`);
                              } else {
                                const partyType = csvImportType === "suppliers" ? "supplier" : "customer";
                                const res = await importPartiesApi(csvImportFile, partyType);
                                toast.success(`Imported ${res.imported} ${res.type.toLowerCase()}(s).`);
                              }
                              setCsvImportFile(null);
                              csvImportInputRef.current && (csvImportInputRef.current.value = "");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Import failed.");
                            } finally {
                              setCsvImporting(false);
                            }
                          }}
                        >
                          <Icons.Upload className="mr-2 h-4 w-4" />
                          {csvImporting ? "Importing..." : csvImportFile ? `Import ${csvImportFile.name}` : "Select file"}
                        </Button>
                        {!csvImportFile && (
                          <Button variant="ghost" size="sm" onClick={() => csvImportInputRef.current?.click()}>
                            Choose CSV
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Required: <strong>code</strong>, <strong>name</strong>. See docs/CSV_IMPORT_FORMAT_SPEC.md for full format. Migrating from Tally, Zoho, or QuickBooks? Use the provider JSON import above, or export from your ERP to CSV and map columns.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
