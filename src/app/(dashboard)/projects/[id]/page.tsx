"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchProjectByIdApi,
  fetchProjectCostingLinksApi,
  fetchProjectLinkableDocumentsApi,
  linkDocumentToProjectApi,
  type LinkableProjectDocument,
  type ProjectCostingSummary,
  type ProjectCostLinkRow,
} from "@/lib/api/projects";
import type { ProjectRow } from "@/lib/types/projects";
import { formatMoney } from "@/lib/money";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = React.useState<ProjectRow | null>(null);
  const [costingSummary, setCostingSummary] = React.useState<ProjectCostingSummary>({
    timesheetHours: 0,
    timesheetAmount: 0,
    documentAmount: 0,
    totalBurn: 0,
    budget: 0,
    burnPct: 0,
    timesheetCostingMode: "EMPLOYEE_SALARY_MONTHLY_173",
    defaultHourlyRate: 0,
    postedDocumentCount: 0,
  });
  const [costLinks, setCostLinks] = React.useState<ProjectCostLinkRow[]>([]);
  const [linkableDocuments, setLinkableDocuments] = React.useState<LinkableProjectDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = React.useState("");
  const [linkSheetOpen, setLinkSheetOpen] = React.useState(false);
  const [linking, setLinking] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const reload = React.useCallback(async () => {
    const [projectItem, costing, candidates] = await Promise.all([
      fetchProjectByIdApi(id),
      fetchProjectCostingLinksApi(id),
      fetchProjectLinkableDocumentsApi(id),
    ]);
    setProject(projectItem);
    setCostingSummary(costing.summary);
    setCostLinks(costing.items);
    setLinkableDocuments(candidates);
    setSelectedDocumentId((current) => current || candidates[0]?.id || "");
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        if (!cancelled) {
          await reload();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (!loading && !project) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Projects", href: "/projects/overview" }, { label: "List", href: "/projects/list" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Project not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/projects/list">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  if (loading || !project) {
    return (
      <PageShell>
        <PageHeader title="Project" breadcrumbs={[{ label: "Projects", href: "/projects/overview" }, { label: "List", href: "/projects/list" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading project...</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`${project.code} — ${project.name}`}
        description={`${project.client} · ${project.startDate} – ${project.endDate}`}
        breadcrumbs={[
          { label: "Projects", href: "/projects/overview" },
          { label: "List", href: "/projects/list" },
          { label: project.code },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {copilotEnabled ? (
              <Button variant="outline" size="sm" onClick={() => openWithPrompt(`Summarize project ${project.code} burn vs budget.`)}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Ask Copilot
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDocumentId(linkableDocuments[0]?.id ?? "");
                setLinkSheetOpen(true);
              }}
            >
              Link transaction
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/timesheets">Timesheets</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects/list">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <ExplainThis prompt="Explain cost centers vs projects. Summarize project burn vs budget." label="Explain project" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(project.budget, "KES")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Timesheet hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{costingSummary.timesheetHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Linked document value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(costingSummary.documentAmount, "KES")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Labor burn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(costingSummary.timesheetAmount, "KES")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total burn vs budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(costingSummary.totalBurn, "KES")}</div>
              <div className="text-xs text-muted-foreground">
                {costingSummary.burnPct.toFixed(1)}% of {formatMoney(project.budget, "KES")}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Cost center mapping, live metadata, and timesheet costing policy.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Client:</span> {project.client}</p>
            <p><span className="text-muted-foreground">Start – End:</span> {project.startDate} – {project.endDate}</p>
            {project.costCenterCode && (
              <p><span className="text-muted-foreground">Cost center:</span> {project.costCenterCode} — {project.costCenterName ?? ""}</p>
            )}
            <p>
              <span className="text-muted-foreground">Timesheet costing mode:</span>{" "}
              {costingSummary.timesheetCostingMode === "PROJECT_DEFAULT_RATE"
                ? "Project default hourly rate"
                : "Employee salary / 173 hours"}
            </p>
            {costingSummary.defaultHourlyRate > 0 && (
              <p>
                <span className="text-muted-foreground">Default hourly rate:</span>{" "}
                {formatMoney(costingSummary.defaultHourlyRate, "KES")}
              </p>
            )}
            <p><span className="text-muted-foreground">Posted documents:</span> {costingSummary.postedDocumentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costing links</CardTitle>
            <CardDescription>Timesheet and document links used for project cost tracking.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Rate source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costLinks.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.kind}</TableCell>
                    <TableCell>{entry.number}</TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.description || "Project-linked entry"}</TableCell>
                    <TableCell className="text-right">
                      {entry.unit === "HOURS" ? `${(entry.quantity ?? 0).toFixed(1)}h` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.unit === "HOURS" ? formatMoney(entry.rate ?? 0, entry.currency) : "—"}
                    </TableCell>
                    <TableCell>
                      {entry.unit === "HOURS"
                        ? entry.rateSource === "EMPLOYEE_OVERRIDE_RATE"
                          ? "Employee override"
                          : entry.rateSource === "EMPLOYEE_SALARY_MONTHLY_173"
                            ? "Salary/173"
                            : "Project default"
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.unit === "HOURS" ? formatMoney(entry.amount, entry.currency) : formatMoney(entry.amount, entry.currency)}
                    </TableCell>
                    <TableCell>{entry.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {costLinks.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No project costing links yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
      <Sheet open={linkSheetOpen} onOpenChange={setLinkSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Link project document</SheetTitle>
            <SheetDescription>Select a document to link into project costing.</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {linkableDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unlinked documents available.</p>
            ) : (
              linkableDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedDocumentId === document.id ? "border-primary bg-muted/40" : ""
                  }`}
                  onClick={() => setSelectedDocumentId(document.id)}
                >
                  <div className="font-medium">{document.number}</div>
                  <div className="text-muted-foreground">
                    {document.typeKey} · {document.date} · {formatMoney(document.total, document.currency)}
                  </div>
                </button>
              ))
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setLinkSheetOpen(false)} disabled={linking}>
              Cancel
            </Button>
            <Button
              disabled={!selectedDocumentId || linking}
              onClick={() => {
                void (async () => {
                  try {
                    setLinking(true);
                    await linkDocumentToProjectApi(id, selectedDocumentId);
                    await reload();
                    setLinkSheetOpen(false);
                    toast.success("Document linked to project.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to link document.");
                  } finally {
                    setLinking(false);
                  }
                })();
              }}
            >
              Link
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
