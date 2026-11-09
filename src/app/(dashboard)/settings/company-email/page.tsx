"use client";
import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import type { CompanyEmail } from "@/lib/api/procurement-flow";
import { useAuthStore } from "@/stores/auth-store";
import { can } from "@/lib/rbac/can";
export default function CompanyEmailPage() {
  const user = useAuthStore((s) => s.user);
  const allowed = can(user, "admin.settings");
  const [data, setData] = React.useState<CompanyEmail | null>(null),
    [apiKey, setApiKey] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [dirty, setDirty] = React.useState(false),
    [error, setError] = React.useState(""),
    [message, setMessage] = React.useState("");
  const load = React.useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setData(await apiRequest<CompanyEmail>("/api/settings/company-email"));
      setDirty(false);
      setApiKey("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  React.useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);
  const patch = (values: Partial<CompanyEmail>) => {
    setData((old) => (old ? { ...old, ...values } : old));
    setDirty(true);
    setMessage("");
  };
  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setData(
        await apiRequest<CompanyEmail>("/api/settings/company-email", {
          method: "PUT",
          body: { ...data, apiKey },
        }),
      );
      setApiKey("");
      setDirty(false);
      setMessage(
        "Saved. Verify the domain to enable sending. Existing queued deliveries require the original configuration revision.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setData(
        await apiRequest<CompanyEmail>("/api/settings/company-email/verify", {
          method: "POST",
          body: { revision: data?.revision },
        }),
      );
      setMessage(
        "Company sender verified. Purchase orders can now be queued after approval.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageShell>
      <PageHeader
        title="Company email"
        description="Use this company's authenticated domain for purchase orders. Supplier emails are sent only after an explicit approved send request."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Company email" },
        ]}
      />
      <div className="max-w-3xl space-y-5 p-6">
        {!allowed ? (
          <p>You need company settings permission to configure email.</p>
        ) : (
          <>
            {error ? (
              <div role="alert">
                {error}{" "}
                <Button variant="outline" onClick={() => void load()}>
                  Reload
                </Button>
              </div>
            ) : null}
            {message ? <p role="status">{message}</p> : null}
            {!data ? (
              <p>Loading company email settings…</p>
            ) : (
              <fieldset
                data-tutorial-hint="company-email-sender"
                disabled={busy}
                className="space-y-4 rounded border p-4"
              >
                <p className="font-semibold">
                  Sending:{" "}
                  {data.enabled && data.verified && !dirty
                    ? "Enabled / domain verified"
                    : "Disabled until saved and verified"}
                </p>
                <label className="block">
                  SendGrid account
                  <select
                    className="mt-1 block w-full rounded border bg-background p-2"
                    value={data.mode}
                    onChange={(e) =>
                      patch({ mode: e.target.value as CompanyEmail["mode"] })
                    }
                  >
                    <option value="OWN_ACCOUNT">Company-owned SendGrid</option>
                    <option value="MANAGED">OdaFlow-managed SendGrid</option>
                  </select>
                </label>
                <label className="block">
                  Company sender name
                  <Input
                    value={data.fromName}
                    onChange={(e) => patch({ fromName: e.target.value })}
                  />
                </label>
                <label className="block">
                  From email
                  <Input
                    type="email"
                    placeholder="purchasing@your-company-domain"
                    value={data.fromEmail}
                    onChange={(e) => patch({ fromEmail: e.target.value })}
                  />
                </label>
                <label className="block">
                  Reply-To email
                  <Input
                    type="email"
                    value={data.replyTo}
                    onChange={(e) => patch({ replyTo: e.target.value })}
                  />
                </label>
                {data.mode === "OWN_ACCOUNT" ? (
                  <label className="block">
                    SendGrid API key
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={apiKey}
                      placeholder={
                        data.configured
                          ? "Saved securely - leave blank to retain"
                          : "SG.…"
                      }
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setDirty(true);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      Stored encrypted on the server and never returned. Use
                      Mail Send and domain-authentication read permissions.{" "}
                      {data.encryptionConfigured
                        ? ""
                        : "Server integration-secret encryption must be configured before saving a key."}
                    </span>
                  </label>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The OdaFlow operator authenticates your domain in the
                    managed SendGrid account. Your company must also prove DNS
                    ownership below. No platform API key is exposed here.
                  </p>
                )}
                <label className="block">
                  Signed Event Webhook verification public key (optional)
                  <Input
                    value={data.webhookKey}
                    onChange={(e) => patch({ webhookKey: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">
                    Without event setup, email status stops at Accepted by
                    provider; it will not claim delivery.
                  </span>
                </label>
                <Button disabled={!dirty} onClick={() => void save()}>
                  Save sender settings
                </Button>
                {data.dnsName ? (
                  <div className="space-y-3 rounded bg-muted p-3" data-tutorial-hint="company-email-domain">
                    <h2 className="font-semibold">
                      Authenticate this company domain
                    </h2>
                    <p>
                      1. In SendGrid Settings &gt; Sender Authentication,
                      authenticate the exact From domain and install its DNS
                      records.
                    </p>
                    <p>2. Add this company ownership TXT record:</p>
                    <p className="break-all font-mono text-xs">
                      Name: {data.dnsName}
                      <br />
                      Value: {data.dnsValue}
                    </p>
                    <p>
                      3. Wait for DNS propagation, then verify. Saving changes
                      disables sending until verification succeeds.
                    </p>
                    <Button
                      variant="outline"
                      disabled={dirty}
                      onClick={() => void verify()}
                    >
                      Verify domain and enable sending
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save the sender to get the company ownership DNS record.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Event Webhook URL:{" "}
                  <span className="break-all">
                    https://erp-api.odaflow.com/api/company-email/events
                  </span>
                  . Enable signed Delivered, Bounce and Dropped events in the
                  selected SendGrid account.
                </p>
              </fieldset>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
