"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/auth-store";
import { isApiConfigured } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import {
  enterSandboxApi,
  fetchEnvironmentStatusApi,
  goLiveApi,
  seedSandboxDummyApi,
  type EnvironmentStatus,
  type GoLiveKeepGroup,
  type GoLiveKeepOption,
} from "@/lib/api/environment";
import { resolveKeepOptions } from "@/lib/settings/go-live-keep-catalog";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { toast } from "sonner";

const GROUP_META: Record<
  GoLiveKeepGroup,
  { title: string; hint: string }
> = {
  protected: {
    title: "Always kept",
    hint: "Warehouses, bank accounts, COA, users, and SFA mappings — cannot be cleared on Go Live.",
  },
  master: {
    title: "Master & setup (uncheck to delete)",
    hint: "All selected by default. Uncheck anything you do not want to keep into Live.",
  },
  operational: {
    title: "Books & activity (uncheck to clear)",
    hint: "All selected by default. Uncheck orders, stock, payments, etc. if you want empty live books.",
  },
};

function KeepCategoryRow({
  option,
  checked,
  disabled,
  onCheckedChange,
}: {
  option: GoLiveKeepOption;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-border/80 px-3 py-3 space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`keep-${option.id}`}
          checked={checked}
          disabled={disabled || option.locked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Label
            htmlFor={`keep-${option.id}`}
            className="flex flex-wrap items-center gap-2 font-medium leading-snug cursor-pointer"
          >
            {option.label}
            {option.locked ? <Badge variant="secondary">Always keep</Badge> : null}
            {option.count > 0 ? (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {option.count.toLocaleString()} rows
              </span>
            ) : null}
          </Label>
          <p className="text-sm text-muted-foreground">{option.description}</p>
          <p className="text-xs text-muted-foreground">
            Includes: {option.includes.join(", ")}
          </p>
          {option.disclaimer ? (
            <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-2 py-1.5">
              {option.disclaimer}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentSettingsPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canRead = permissions.includes("settings.org.read") || permissions.includes("*");
  const canManage = permissions.includes("admin.settings") || permissions.includes("*");
  const setSession = useAuthStore((s) => s.setSession);
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const orgTemplate = React.useMemo(
    () => ({ templateId, industryCategory }),
    [templateId, industryCategory]
  );

  const [status, setStatus] = React.useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
  const [goingLive, setGoingLive] = React.useState(false);
  const [enteringSandbox, setEnteringSandbox] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState("");
  const [keepIds, setKeepIds] = React.useState<Set<string>>(new Set());

  const refresh = React.useCallback(async () => {
    const next = await fetchEnvironmentStatusApi();
    setStatus(next);
    const resolved = resolveKeepOptions(next, orgTemplate);
    setKeepIds(new Set(resolved.defaultKeepCategoryIds));
  }, [orgTemplate]);

  React.useEffect(() => {
    if (!isApiConfigured() || !canRead) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    refresh()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load environment."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, refresh]);

  async function reloadSession() {
    const session = await fetchRuntimeSession();
    setSession({
      user: session.user,
      org: session.org,
      tenant: session.tenant,
      currentBranch: session.currentBranch,
      branches: session.branches,
      permissions: session.permissions,
      isPlatformOperator: session.isPlatformOperator,
    });
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const next = await seedSandboxDummyApi();
      setStatus(next);
      setKeepIds(new Set(resolveKeepOptions(next, orgTemplate).defaultKeepCategoryIds));
      toast.success("Dummy products, parties, stock, and sample documents were loaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load dummy data.");
    } finally {
      setSeeding(false);
    }
  }

  async function handleEnterSandbox() {
    setEnteringSandbox(true);
    try {
      const next = await enterSandboxApi(confirmName);
      setStatus(next);
      setKeepIds(new Set(resolveKeepOptions(next, orgTemplate).defaultKeepCategoryIds));
      setConfirmName("");
      await reloadSession();
      toast.success("Account is in Sandbox. Existing books were not wiped.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move to Sandbox.");
    } finally {
      setEnteringSandbox(false);
    }
  }

  async function handleGoLive() {
    setGoingLive(true);
    try {
      const next = await goLiveApi(confirmName, [...keepIds]);
      setStatus(next);
      setConfirmName("");
      await reloadSession();
      toast.success("Account is live. Selected data was kept; unselected data was cleared.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Go Live failed.");
    } finally {
      setGoingLive(false);
    }
  }

  function toggleKeep(id: string, next: boolean) {
    setKeepIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  if (!canRead) {
    return (
      <PageLayout title="Environment" description="Sandbox and live books">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </PageLayout>
    );
  }

  const isSandbox = status?.environmentMode === "SANDBOX";
  const { keepOptions } = resolveKeepOptions(status, orgTemplate);
  const grouped = (["protected", "master", "operational"] as GoLiveKeepGroup[]).map((group) => ({
    group,
    ...GROUP_META[group],
    options: keepOptions.filter((o) => o.group === group),
  }));
  const willDeleteCount = keepOptions
    .filter((o) => !o.locked && !keepIds.has(o.id))
    .reduce((sum, o) => sum + o.count, 0);

  return (
    <PageLayout
      title="Environment"
      description="Test in Sandbox, then Go Live — choose what to keep"
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Environment" },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current mode
              {status ? (
                <Badge variant={isSandbox ? "secondary" : "default"}>
                  {isSandbox ? "Sandbox" : "Live"}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Switch between Sandbox (practice) and Live. Going Live clears only the data you leave
              unchecked. Moving to Sandbox does not delete existing data.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {loading ? "Loading…" : null}
            {!loading && status?.wentLiveAt
              ? `Went live ${new Date(status.wentLiveAt).toLocaleString()}.`
              : null}
            {!loading && isSandbox && status?.dummyLoaded
              ? " Dummy data is loaded."
              : null}
            {!loading && isSandbox && !status?.dummyLoaded
              ? " No dummy data yet — load it to practise, or skip and go live."
              : null}
          </CardContent>
        </Card>

        {isSandbox ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Dummy data</CardTitle>
                <CardDescription>
                  Adds sample products, a customer and supplier, stock (if a warehouse exists), and draft
                  sales/purchase orders tagged as sandbox seed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void handleSeed()} disabled={!canManage || !status?.canLoadDummy || seeding}>
                  {seeding ? "Loading…" : "Load dummy data"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Go Live</CardTitle>
                <CardDescription>
                  Everything is selected by default. Uncheck what you do not want to keep into Live
                  (uncheck document numbers to restart at 1). Type{" "}
                  <span className="font-medium text-foreground">{status?.orgName}</span> to confirm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {grouped.map(({ group, title, hint, options }) =>
                  options.length === 0 ? null : (
                    <div key={group} className="space-y-3">
                      <div>
                        <h3 className="text-sm font-medium">{title}</h3>
                        <p className="text-xs text-muted-foreground">{hint}</p>
                      </div>
                      <div className="space-y-2">
                        {options.map((option) => (
                          <KeepCategoryRow
                            key={option.id}
                            option={option}
                            checked={option.locked || keepIds.has(option.id)}
                            disabled={!canManage || goingLive}
                            onCheckedChange={(next) => toggleKeep(option.id, next)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}

                <p className="text-sm text-muted-foreground">
                  {willDeleteCount > 0
                    ? `About ${willDeleteCount.toLocaleString()} rows across unchecked groups will be cleared.`
                    : "All selectable groups are kept — only mode switches to Live."}
                </p>

                <div className="space-y-2 max-w-md">
                  <Label htmlFor="confirm-org-name">Organization name</Label>
                  <Input
                    id="confirm-org-name"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    disabled={!canManage || goingLive}
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => void handleGoLive()}
                  disabled={!canManage || goingLive || !confirmName.trim()}
                >
                  {goingLive ? "Going live…" : "Go Live"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Move to Sandbox</CardTitle>
              <CardDescription>
                Switch this account to Sandbox so you can load dummy data and practise. Existing data
                stays until you Go Live and choose what to clear. Type{" "}
                <span className="font-medium text-foreground">{status?.orgName}</span> to confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-md">
                <Label htmlFor="confirm-org-name-sandbox">Organization name</Label>
                <Input
                  id="confirm-org-name-sandbox"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  disabled={!canManage || enteringSandbox}
                  autoComplete="off"
                />
              </div>
              <Button
                onClick={() => void handleEnterSandbox()}
                disabled={!canManage || enteringSandbox || !confirmName.trim()}
              >
                {enteringSandbox ? "Switching…" : "Move to Sandbox"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
