"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getMockRules, type AutomationRule } from "@/lib/mock/automation-rules";
import { useCopilotStore } from "@/stores/copilot-store";
import * as Icons from "lucide-react";

export default function AutomationRulesPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formTrigger, setFormTrigger] = React.useState("");
  const [formConditions, setFormConditions] = React.useState("");
  const [formActions, setFormActions] = React.useState("");

  const allRows = React.useMemo(() => getMockRules(), []);

  const resetForm = () => {
    setFormTrigger("");
    setFormConditions("");
    setFormActions("");
  };
  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Rule",
        accessor: (r: AutomationRule) => (
          <span className="font-medium">{r.name}</span>
        ),
        sticky: true,
      },
      { id: "trigger", header: "Trigger", accessor: "trigger" as keyof AutomationRule },
      { id: "conditions", header: "Conditions", accessor: "conditions" as keyof AutomationRule },
      { id: "actions", header: "Actions", accessor: "actions" as keyof AutomationRule },
      {
        id: "enabled",
        header: "Status",
        accessor: (r: AutomationRule) => (
          <Badge variant={r.enabled ? "default" : "secondary"}>
            {r.enabled ? "On" : "Off"}
          </Badge>
        ),
      },
    ],
    []
  );

  const handleGenerateWithCopilot = () => {
    openWithPrompt("Generate an automation rule for: ");
    setCreateOpen(false);
  };

  const handleOpenCreate = (open: boolean) => {
    if (!open) resetForm();
    setCreateOpen(open);
  };

  const TRIGGER_EXAMPLES = [
    "Stock below reorder point",
    "Invoice > 100,000",
    "Bill from Supplier Y",
    "Sales order pending > 24h",
  ];
  const ACTION_TYPES = [
    "Notify",
    "Create draft PO",
    "Assign to manager",
    "Require approval",
  ];

  return (
    <PageShell>
      <PageHeader
        title="Automation Rules"
        description="IF/THEN rules: triggers, conditions, actions"
        breadcrumbs={[
          { label: "Automation", href: "/automation" },
          { label: "Rules" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => handleOpenCreate(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search rules..."
          searchValue={search}
          onSearchChange={setSearch}
        />
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>
              {filtered.length} rule(s). Create rules to automate workflows and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<AutomationRule>
              data={filtered}
              columns={columns}
              emptyMessage="No rules. Create one or generate with Copilot."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={handleOpenCreate}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create rule</SheetTitle>
            <SheetDescription>
              Define trigger, conditions, and actions. Or generate with Copilot.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleGenerateWithCopilot}
            >
              <Icons.Sparkles className="h-4 w-4" />
              Generate rule with Copilot
            </Button>
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Trigger</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TRIGGER_EXAMPLES.map((ex) => (
                    <Button
                      key={ex}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setFormTrigger(ex)}
                    >
                      {ex}
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder="e.g. Stock below reorder point, Invoice > X, Bill from Supplier Y"
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Conditions</Label>
                <Input
                  placeholder="e.g. Warehouse = WH-Main"
                  value={formConditions}
                  onChange={(e) => setFormConditions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Action type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_TYPES.map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (a === "Require approval") window.alert("Require approval (stub): API pending.");
                      }}
                    >
                      {a}
                    </Button>
                  ))}
                </div>
                <Label className="text-muted-foreground text-xs">Actions</Label>
                <Input
                  placeholder="e.g. Create draft PO, Notify purchaser, Require approval"
                  value={formActions}
                  onChange={(e) => setFormActions(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => handleOpenCreate(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleOpenCreate(false)}>Save rule</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
