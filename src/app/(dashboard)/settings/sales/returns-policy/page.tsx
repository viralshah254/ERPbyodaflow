"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchProductCategoriesApi, type ItemCategoryRow } from "@/lib/api/product-categories";
import {
  fetchReturnsPolicyApi,
  RETURN_ACTION_LABELS,
  RETURN_ACTIONS,
  saveReturnsPolicyApi,
  type ReturnAction,
  type ReturnsPolicy,
} from "@/lib/api/returns-policy";

const USE_DEFAULT = "__default__";

function ActionSelect(props: { value: string; onChange: (value: string) => void; allowDefault?: string; disabled?: boolean; id?: string }) {
  return (
    <select
      id={props.id}
      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {props.allowDefault ? <option value={USE_DEFAULT}>{props.allowDefault}</option> : null}
      {RETURN_ACTIONS.map((action) => (
        <option key={action} value={action}>{RETURN_ACTION_LABELS[action].label}</option>
      ))}
    </select>
  );
}

export default function ReturnsPolicyPage() {
  const [policy, setPolicy] = React.useState<ReturnsPolicy | null>(null);
  const [categories, setCategories] = React.useState<ItemCategoryRow[]>([]);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let current = true;
    fetchReturnsPolicyApi()
      .then((data) => { if (current) setPolicy(data); })
      .catch((e) => { if (current) setError(e instanceof Error ? e.message : "Could not load the returns policy."); });
    fetchProductCategoriesApi()
      .then((rows) => { if (current) setCategories(rows); })
      .catch(() => { if (current) toast.error("Could not load product categories."); });
    return () => { current = false; };
  }, []);

  const update = (patch: Partial<ReturnsPolicy>) => setPolicy((prev) => (prev ? { ...prev, ...patch } : prev));

  async function save() {
    if (!policy || saving) return;
    setSaving(true);
    try {
      setPolicy(await saveReturnsPolicyApi(policy));
      toast.success("Returns policy saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the returns policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout
      title="Returns policy"
      description="Decide what happens to goods that come back from customers and route trucks. Damaged goods always go to the damaged store with a write-off case."
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !policy ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {!policy.configured ? (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">
                No policy is saved yet, so good returns go straight back on sale. Choose a rule for each category and save.
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>The four options</CardTitle>
              <CardDescription>Each category of goods returned in good condition follows one of these.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {RETURN_ACTIONS.map((action) => (
                <div key={action} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{RETURN_ACTION_LABELS[action].label}</p>
                  <p className="text-sm text-muted-foreground">{RETURN_ACTION_LABELS[action].hint}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
              <CardDescription>A return reason overrides these. Short-life products can be blocked from resale whatever their category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="defaultAction">Categories without their own rule</Label>
                  <ActionSelect id="defaultAction" value={policy.defaultAction} onChange={(v) => update({ defaultAction: v as ReturnAction })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="perishable">Never resell products with a shelf life of (days) or less</Label>
                  <Input
                    id="perishable"
                    type="number"
                    min={0}
                    value={policy.perishableShelfLifeDays}
                    onChange={(e) => update({ perishableShelfLifeDays: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <p className="text-xs text-muted-foreground">0 turns this off. 7 suits bread and cakes.</p>
                </div>
              </div>
              {categories.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product category</TableHead>
                      <TableHead className="w-64">Good returns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>
                          <ActionSelect
                            value={policy.byCategory[category.id] ?? USE_DEFAULT}
                            allowDefault={`Default (${RETURN_ACTION_LABELS[policy.defaultAction].label})`}
                            onChange={(v) => {
                              const next = { ...policy.byCategory };
                              if (v === USE_DEFAULT) delete next[category.id];
                              else next[category.id] = v as ReturnAction;
                              update({ byCategory: next });
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No product categories yet. Every product follows the default.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Return reasons</CardTitle>
              <CardDescription>Shown when a driver return or a customer return is recorded.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-56">Action</TableHead>
                    <TableHead className="w-28">Counts as damaged</TableHead>
                    <TableHead className="w-20">In use</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policy.reasons.map((reason, index) => {
                    const patch = (p: Partial<typeof reason>) =>
                      update({ reasons: policy.reasons.map((r, i) => (i === index ? { ...r, ...p } : r)) });
                    return (
                      <TableRow key={reason.code}>
                        <TableCell>
                          <Input value={reason.label} onChange={(e) => patch({ label: e.target.value })} aria-label={`Label for ${reason.code}`} />
                        </TableCell>
                        <TableCell>
                          <ActionSelect
                            value={reason.action ?? USE_DEFAULT}
                            allowDefault="Use the category rule"
                            disabled={reason.damaged}
                            onChange={(v) => patch({ action: v === USE_DEFAULT ? undefined : (v as ReturnAction) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch checked={reason.damaged === true} onCheckedChange={(checked) => patch({ damaged: checked })} aria-label={`${reason.label} counts as damaged`} />
                        </TableCell>
                        <TableCell>
                          <Switch checked={reason.active} onCheckedChange={(checked) => patch({ active: checked })} aria-label={`${reason.label} in use`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  update({ reasons: [...policy.reasons, { code: `REASON_${policy.reasons.length + 1}`, label: "New reason", active: true }] })
                }
              >
                Add reason
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Returns allowance</CardTitle>
              <CardDescription>Flag customers whose credited returns in a month are above this share of their sales. 0 turns it off.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-xs space-y-1">
              <Label htmlFor="allowance">Allowance (% of monthly sales)</Label>
              <Input
                id="allowance"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={policy.returnsAllowancePercent}
                onChange={(e) => update({ returnsAllowancePercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save returns policy"}</Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
