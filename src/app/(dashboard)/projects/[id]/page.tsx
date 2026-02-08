"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getMockProjectById } from "@/lib/mock/projects/list";
import { getMockProjectCosts } from "@/lib/mock/projects/costs";
import { formatMoney } from "@/lib/money";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const project = React.useMemo(() => getMockProjectById(id), [id]);
  const costs = React.useMemo(() => getMockProjectCosts(id), [id]);
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const totalCost = costs.reduce((s, c) => s + c.amount, 0);
  const burnPct = project && project.budget > 0 ? Math.round((totalCost / project.budget) * 100) : 0;

  if (!project) {
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
            <Button variant="outline" size="sm" onClick={() => openWithPrompt(`Summarize project ${project.code} burn vs budget.`)}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Ask Copilot
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Link transaction (stub). Attach bill/journal/expense.")}>
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
              <CardTitle className="text-sm font-medium">Cost to date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalCost, "KES")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Burn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{burnPct}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>{project.status.replace("_", " ")}</Badge>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Cost center mapping (link to COA).</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Client:</span> {project.client}</p>
            <p><span className="text-muted-foreground">Start – End:</span> {project.startDate} – {project.endDate}</p>
            {project.costCenterCode && (
              <p><span className="text-muted-foreground">Cost center:</span> {project.costCenterCode} — {project.costCenterName ?? ""}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked transactions</CardTitle>
            <CardDescription>Bills, journals, expenses (mock).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.docType}</TableCell>
                    <TableCell>{c.docNumber}</TableCell>
                    <TableCell>{c.date}</TableCell>
                    <TableCell className="text-right">{formatMoney(c.amount, c.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {costs.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No linked transactions.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
