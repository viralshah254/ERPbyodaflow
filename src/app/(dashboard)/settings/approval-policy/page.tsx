"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApprovalPolicyApi, saveApprovalPolicyApi, type ApprovalPolicyRule } from "@/lib/api/approval-policy";
import { fetchUsersApi } from "@/lib/api/users-roles";
import type { UserRow } from "@/lib/types/users-roles";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function ApprovalPolicyPage() {
  const [rules, setRules] = React.useState<ApprovalPolicyRule[]>([]);
  const [version, setVersion] = React.useState(1);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    Promise.all([fetchApprovalPolicyApi(), fetchUsersApi().catch(() => [])])
      .then(([payload, nextUsers]) => {
        setRules(payload.rules ?? []);
        setVersion(payload.version);
        setUsers(nextUsers.filter((user) => user.status === "ACTIVE"));
      })
      .catch((error) => toast.error((error as Error).message || "Failed to load approval policy."));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Approval policy configurator"
        description="Configure maker-checker rules by document type, amount threshold, and branch."
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Approval policy" }]}
        sticky
        showCommandHint
        actions={
          <Button
            disabled={saving}
            data-tutorial-hint="approval-policy-save"
            onClick={async () => {
              try {
                setSaving(true);
                const saved = await saveApprovalPolicyApi(version, rules);
                setRules(saved.rules);
                setVersion(saved.version);
                toast.success(`Approval policy v${saved.version} saved.`);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to save approval policy.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      />
      <div className="p-6">
        <Card data-tutorial-hint="approval-policy-rules">
          <CardHeader>
            <CardTitle>Rules · version {version}</CardTitle>
            <CardDescription>First matching rule with the highest amount threshold is applied.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id || index} className="grid gap-3 rounded border p-3 md:grid-cols-2">
                <Input
                  placeholder="Document type"
                  value={rule.documentType}
                  onChange={(event) => {
                    const updated = [...rules];
                    updated[index] = { ...updated[index], documentType: event.target.value };
                    setRules(updated);
                  }}
                />
                <Input
                  placeholder="Min amount"
                  type="number"
                  value={rule.minAmount ?? 0}
                  onChange={(event) => {
                    const updated = [...rules];
                    updated[index] = { ...updated[index], minAmount: Number(event.target.value) };
                    setRules(updated);
                  }}
                />
                <Input
                  placeholder="Branch ID (optional)"
                  value={rule.branchId ?? ""}
                  onChange={(event) => {
                    const updated = [...rules];
                    updated[index] = { ...updated[index], branchId: event.target.value || undefined };
                    setRules(updated);
                  }}
                />
                <select
                  aria-label="Designated approver"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={rule.designatedApproverId ?? ""}
                  onChange={(event) => {
                    const updated = [...rules];
                    updated[index] = { ...updated[index], designatedApproverId: event.target.value || undefined };
                    setRules(updated);
                  }}
                >
                  <option value="">Any authorized approver</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={rule.makerCheckerRequired !== false}
                      onCheckedChange={(checked) => {
                        const updated = [...rules];
                        updated[index] = { ...updated[index], makerCheckerRequired: checked === true };
                        setRules(updated);
                      }}
                    />
                    Maker-checker required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={rule.isActive !== false}
                      onCheckedChange={(checked) => {
                        const updated = [...rules];
                        updated[index] = { ...updated[index], isActive: checked === true };
                        setRules(updated);
                      }}
                    />
                    Active
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRules(rules.filter((_, ruleIndex) => ruleIndex !== index))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              data-tutorial-hint="approval-policy-add"
              onClick={() =>
                setRules([
                  ...rules,
                  {
                    id: `rule-${Date.now()}`,
                    documentType: "invoice",
                    minAmount: 0,
                    makerCheckerRequired: true,
                    isActive: true,
                  },
                ])
              }
            >
              Add rule
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
