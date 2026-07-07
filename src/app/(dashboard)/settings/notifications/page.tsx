"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import {
  fetchNotificationSettingsApi,
  fetchPushTokenStatusApi,
  sendOrgAdminTestPushApi,
  sendTestPushNotificationApi,
  updateNotificationSettingsApi,
} from "@/lib/api/notifications";
import { initWebPushNotifications } from "@/lib/push-notifications";
import { isDevelopmentEnvironment } from "@/lib/runtime-flags";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function NotificationsPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canTestOrgAdmins =
    permissions.includes("admin.users") || permissions.includes("*");

  const [email, setEmail] = React.useState(true);
  const [sms, setSms] = React.useState(false);
  const [whatsapp, setWhatsapp] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testingPush, setTestingPush] = React.useState(false);
  const [testingOrgAdmins, setTestingOrgAdmins] = React.useState(false);
  const [registeringPush, setRegisteringPush] = React.useState(false);
  const [pushStatus, setPushStatus] = React.useState<{
    registered: boolean;
    tokenCount: number;
    platforms: string[];
  } | null>(null);
  const [browserPermission, setBrowserPermission] = React.useState<string>("unknown");

  const refreshPushStatus = React.useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
    try {
      const status = await fetchPushTokenStatusApi();
      setPushStatus(status);
    } catch {
      setPushStatus(null);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    void fetchNotificationSettingsApi()
      .then((settings) => {
        if (!active) return;
        setEmail(!!settings.email);
        setSms(!!settings.sms);
        setWhatsapp(!!settings.whatsapp);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load notification settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isDevelopmentEnvironment()) return;
    void refreshPushStatus();
  }, [refreshPushStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettingsApi({ inApp: true, email, sms, whatsapp });
      toast.success("Notification settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const result = await sendTestPushNotificationApi({
        title: "OdaFlow test notification",
        body: "Push notifications are working on this device.",
        entityType: "approval",
        alsoInbox: true,
      });
      await refreshPushStatus();
      if (result.sent && (result.successCount ?? 0) > 0) {
        toast.success(
          `Delivered to ${result.successCount} of ${result.tokenCount ?? 0} device(s).` +
            (result.staleRemoved ? ` Removed ${result.staleRemoved} stale token(s).` : "") +
            " If this tab is open, check for an in-app toast too."
        );
      } else {
        toast.error(
          result.reason ??
            `FCM did not deliver (0 of ${result.tokenCount ?? 0} devices). Click Register this browser, then retry.`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test push failed.");
    } finally {
      setTestingPush(false);
    }
  };

  const handleRegisterBrowser = async () => {
    setRegisteringPush(true);
    try {
      const result = await initWebPushNotifications();
      if (result.registered) {
        toast.success("This browser is registered for push notifications.");
      } else {
        toast.error(result.reason ?? "Could not register this browser for push.");
      }
      await refreshPushStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Push registration failed.");
    } finally {
      setRegisteringPush(false);
    }
  };

  const handleOrgAdminTest = async () => {
    setTestingOrgAdmins(true);
    try {
      const result = await sendOrgAdminTestPushApi({
        title: "Test: Password reset requested",
        message:
          "Test admin alert — same routing as forgot-password. HQ / COO / admins with web or mobile tokens should receive this.",
      });
      toast.success(`${result.message} Check Automation → Alerts inbox.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Org admin test failed.");
    } finally {
      setTestingOrgAdmins(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        description="Email, SMS, WhatsApp toggles. Notification rules link to automation."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Notifications" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain notification channels and rules." label="Explain notifications" />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              Save
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channels</CardTitle>
            <CardDescription>Channel preferences are saved to backend org settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="email" checked={email} onCheckedChange={(c) => setEmail(c === true)} />
              <Label htmlFor="email">Email</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="sms" checked={sms} onCheckedChange={(c) => setSms(c === true)} />
              <Label htmlFor="sms">SMS</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="wa" checked={whatsapp} onCheckedChange={(c) => setWhatsapp(c === true)} />
              <Label htmlFor="wa">WhatsApp</Label>
            </div>
          </CardContent>
        </Card>
        {isDevelopmentEnvironment() ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Push notifications</CardTitle>
            <CardDescription>
              Browser and mobile apps register FCM device tokens on login. Allow notifications when
              prompted, then send a test alert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm space-y-1">
              <p>
                Browser permission:{" "}
                <span className="font-medium">{browserPermission}</span>
              </p>
              <p>
                Server tokens for you:{" "}
                <span className="font-medium">
                  {pushStatus?.registered
                    ? `${pushStatus.tokenCount} (${pushStatus.platforms.join(", ") || "unknown"})`
                    : "none registered"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRegisterBrowser} disabled={registeringPush}>
                <Icons.Bell className="mr-2 h-4 w-4" />
                {registeringPush ? "Registering…" : "Register this browser"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestPush} disabled={testingPush}>
                <Icons.BellRing className="mr-2 h-4 w-4" />
                {testingPush ? "Sending…" : "Send test push to me"}
              </Button>
              {canTestOrgAdmins ? (
                <Button variant="outline" size="sm" onClick={handleOrgAdminTest} disabled={testingOrgAdmins}>
                  <Icons.Users className="mr-2 h-4 w-4" />
                  {testingOrgAdmins ? "Sending…" : "Test HQ / admin alert"}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/automation/alerts">Open alerts inbox</Link>
              </Button>
            </div>
            {canTestOrgAdmins ? (
              <p className="text-xs text-muted-foreground">
                &quot;Test HQ / admin alert&quot; sends inbox + push to every user with{" "}
                <code className="text-xs">admin.users</code> in your org (HQ includes franchise
                outlets) — same recipients as forgot-password.
              </p>
            ) : null}
          </CardContent>
        </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification rules</CardTitle>
            <CardDescription>Links to automation rules. Configure triggers and actions there.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/automation/rules">
                <Icons.Workflow className="mr-2 h-4 w-4" />
                Open Rules Engine
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
