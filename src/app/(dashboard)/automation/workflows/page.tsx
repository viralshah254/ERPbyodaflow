"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  createAutomationWorkflowApi,
  fetchAutomationWorkflowsApi,
  type AutomationWorkflowRow,
} from "@/lib/api/automation-workflows";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ApprovalsWorkflowsPage() {
  const [rows, setRows] = React.useState<AutomationWorkflowRow[]>([]);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    const items = await fetchAutomationWorkflowsApi();
    setRows(items);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load workflows.");
    });
  }, [reload]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Workflow name is required.");
      return;
    }
    setSaving(true);
    try {
      await createAutomationWorkflowApi(name.trim());
      setName("");
      await reload();
      toast.success("Workflow created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workflow.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Approvals Workflows"
      description="Configure multi-step approval processes"
      actions={
        <Button onClick={() => void handleCreate()} disabled={saving}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          {saving ? "Creating..." : "Create Workflow"}
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflows</CardTitle>
          <CardDescription>Live approval workflow definitions saved in automation settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Purchase order approval"
            />
            <Button onClick={() => void handleCreate()} disabled={saving}>
              Add
            </Button>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon="CheckCircle2"
              title="No workflows configured"
              description="Create approval workflows for orders, POs, and journals."
            />
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.createdAt ? `Created ${row.createdAt.slice(0, 10)}` : "Live workflow"}
                    </p>
                  </div>
                  <Badge variant={row.enabled ? "default" : "secondary"}>
                    {row.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}





