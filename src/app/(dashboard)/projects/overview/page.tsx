"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchProjectCostingLinksApi, fetchProjectsApi } from "@/lib/api/projects";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/projects/list", label: "Projects", desc: "List, budget, cost center", icon: "FolderKanban" as const },
  { href: "/timesheets", label: "Timesheets", desc: "Weekly grid, submit for approval", icon: "Clock" as const },
];

export default function ProjectsOverviewPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [projects, setProjects] = React.useState<Awaited<ReturnType<typeof fetchProjectsApi>>>([]);
  const [totalCost, setTotalCost] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    async function load() {
      const projectRows = await fetchProjectsApi();
      if (!active) return;
      setProjects(projectRows);
      const costing = await Promise.all(
        projectRows.map(async (project) => {
          try {
            const payload = await fetchProjectCostingLinksApi(project.id);
            return payload.summary.totalBurn ?? 0;
          } catch {
            return 0;
          }
        })
      );
      if (!active) return;
      setTotalCost(costing.reduce((sum, amount) => sum + amount, 0));
    }
    void load().catch((error) => {
      if (!active) return;
      toast.error(error instanceof Error ? error.message : "Failed to load project overview.");
      setProjects([]);
      setTotalCost(0);
    });
    return () => {
      active = false;
    };
  }, []);

  const active = projects.filter((p) => p.status === "ACTIVE");
  const totalBudget = active.reduce((s, p) => s + p.budget, 0);

  return (
    <PageShell>
      <PageHeader
        title="Projects & Cost Centers"
        description="Projects, budget vs actual, timesheets"
        breadcrumbs={[{ label: "Projects" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => openWithPrompt("Summarize project burn vs budget. Explain cost centers vs projects.")}>
            <Icons.Sparkles className="mr-2 h-4 w-4" />
            Ask Copilot
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick stats</span>
          <ExplainThis prompt="Explain cost centers vs projects. Summarize project burn vs budget." label="Explain projects" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active projects</CardTitle>
              <Icons.FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{active.length}</div>
              <p className="text-xs text-muted-foreground">Total budget {formatMoney(totalBudget, "KES")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost to date</CardTitle>
              <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalCost, "KES")}</div>
              <p className="text-xs text-muted-foreground">Linked transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timesheets</CardTitle>
              <Icons.Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">Submit for approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Burn vs budget</CardTitle>
              <Icons.PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBudget > 0 ? Math.round((totalCost / totalBudget) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Circle) as React.ComponentType<{ className?: string }>;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
