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
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function NotificationsPage() {
  const saved = React.useMemo(
    () =>
      loadStoredValue("odaflow_notification_settings", () => ({
        email: true,
        sms: false,
        whatsapp: false,
      })),
    []
  );
  const [email, setEmail] = React.useState(saved.email);
  const [sms, setSms] = React.useState(saved.sms);
  const [whatsapp, setWhatsapp] = React.useState(saved.whatsapp);

  const handleSave = () => {
    saveStoredValue("odaflow_notification_settings", { email, sms, whatsapp });
    toast.success("Notification settings saved.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        description="Email, SMS, WhatsApp toggles. Notification rules link to automation."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Notifications" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain notification channels and rules." label="Explain notifications" />
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channels</CardTitle>
            <CardDescription>Email, SMS, and WhatsApp channel preferences stored for demo mode.</CardDescription>
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
