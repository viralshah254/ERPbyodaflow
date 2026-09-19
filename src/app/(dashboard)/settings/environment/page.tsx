"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { isApiConfigured } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import {
  enterSandboxApi,
  fetchEnvironmentStatusApi,
  goLiveApi,
  seedSandboxDummyApi,
  type EnvironmentStatus,
} from "@/lib/api/environment";
import { toast } from "sonner";

export default function EnvironmentSettingsPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canRead = permissions.includes("settings.org.read") || permissions.includes("*");
  const canManage = permissions.includes("admin.settings") || permissions.includes("*");
  const setSession = useAuthStore((s) => s.setSession);

  const [status, setStatus] = React.useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
  const [goingLive, setGoingLive] = React.useState(false);
  const [enteringSandbox, setEnteringSandbox] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState("");

  const refresh = React.useCallback(async () => {
    const next = await fetchEnvironmentStatusApi();
    setStatus(next);
  }, []);

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
      const next = await goLiveApi(confirmName);
      setStatus(next);
      setConfirmName("");
      await reloadSession();
      toast.success("Account is live. Operational books are empty.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Go Live failed.");
    } finally {
      setGoingLive(false);
    }
  }

  if (!canRead) {
    return (
      <PageLayout title="Environment" description="Sandbox and live books">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </PageLayout>
    );
  }

  const isSandbox = status?.environmentMode === "SANDBOX";

  return (
    <PageLayout
      title="Environment"
      description="Test in Sandbox with dummy data, then Go Live with empty real books"
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
              Switch between Sandbox (practice, dummy data) and Live. Going Live wipes operational
              books. Moving to Sandbox does not delete existing data.
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
              ? " No dummy data yet — load it to practise, or skip and go live empty."
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
                  Wipes operational books. You can move back to Sandbox later. Type{" "}
                  <span className="font-medium text-foreground">{status?.orgName}</span> to confirm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    Will delete {status?.preview.documents ?? 0} documents, {status?.preview.stockLevels ?? 0} stock
                    rows, {status?.preview.payments ?? 0} payments, and reset number sequences.
                  </li>
                  <li>
                    Will remove dummy masters ({status?.preview.seededProducts ?? 0} products,{" "}
                    {status?.preview.seededParties ?? 0} parties, {status?.preview.seededPriceLists ?? 0} price
                    lists).
                  </li>
                  <li>Keeps users, roles, branches, warehouses, COA, taxes, currencies, and integrations.</li>
                </ul>
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
                Switch this account to Sandbox so you can load dummy data and practise. Existing
                documents, stock, and payments stay. Going Live later will wipe operational books.
                Type <span className="font-medium text-foreground">{status?.orgName}</span> to confirm.
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
