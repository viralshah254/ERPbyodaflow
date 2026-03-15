"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApprovalPolicyApi, saveApprovalPolicyApi, type ApprovalPolicyRule } from "@/lib/api/approval-policy";
import { toast } from "sonner";

export default function ApprovalPolicyPage() {
  const [rules, setRules] = React.useState<ApprovalPolicyRule[]>([]);

  React.useEffect(() => {
    fetchApprovalPolicyApi()
      .then((payload) => setRules(payload.rules ?? []))
      .catch((error) => toast.error((error as Error).message || "Failed to load approval policy."));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Approval policy configurator"
        description="Configure maker-checker rules by document type, amount threshold, and branch."
        breadcrumbs={[{ label: "Settings", href: "/settings/org" }, { label: "Approval policy" }]}
        sticky
        showCommandHint
        actions={
          <Button
            onClick={async () => {
              const saved = await saveApprovalPolicyApi(rules);
              setRules(saved.rules);
              toast.success("Approval policy saved.");
            }}
          >
            Save
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>First matching rule with the highest amount threshold is applied.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id || index} className="grid gap-2 rounded border p-3 md:grid-cols-4">
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
                <Input
                  placeholder="Designated approver ID"
                  value={rule.designatedApproverId ?? ""}
                  onChange={(event) => {
                    const updated = [...rules];
                    updated[index] = { ...updated[index], designatedApproverId: event.target.value || undefined };
                    setRules(updated);
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
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
