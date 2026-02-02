"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

type IntStatus = "connected" | "disconnected" | "coming_soon";

const INTEGRATIONS: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  status: IntStatus;
  setupSteps?: string[];
}> = [
  {
    id: "accounting",
    name: "Accounting exports",
    description: "Export to QuickBooks, Xero, or generic formats",
    icon: "Calculator",
    status: "disconnected",
    setupSteps: ["Connect account", "Map accounts", "Set schedule"],
  },
  {
    id: "email-inbox",
    name: "Email inbox ingestion",
    description: "Parse orders and documents from email",
    icon: "Mail",
    status: "disconnected",
    setupSteps: ["Link mailbox", "Configure rules", "Map fields"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp (future)",
    description: "Order and support via WhatsApp",
    icon: "MessageCircle",
    status: "coming_soon",
  },
  {
    id: "webhooks",
    name: "Webhooks & API keys",
    description: "External access and event webhooks",
    icon: "Plug",
    status: "disconnected",
    setupSteps: ["Create API key", "Configure endpoints", "Test"],
  },
];

export default function IntegrationsPage() {
  const [setupOpen, setSetupOpen] = React.useState<string | null>(null);

  return (
    <PageLayout
      title="Integrations"
      description="Connect with accounting, email, and APIs"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((int) => {
          const IconComponent = (Icons[int.icon as keyof typeof Icons] || Icons.Plug) as React.ComponentType<{ className?: string }>;
          const isComingSoon = int.status === "coming_soon";

          return (
            <Card key={int.id} className={isComingSoon ? "opacity-75" : ""}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{int.name}</CardTitle>
                    <CardDescription>{int.description}</CardDescription>
                  </div>
                </div>
                {isComingSoon ? (
                  <Badge variant="secondary">Coming soon</Badge>
                ) : (
                  <Badge variant={int.status === "connected" ? "default" : "outline"}>
                    {int.status === "connected" ? "Connected" : "Not connected"}
                  </Badge>
                )}
              </CardHeader>
              {!isComingSoon && (
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSetupOpen(setupOpen === int.id ? null : int.id)}
                    >
                      {int.status === "connected" ? "Manage" : "Setup"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled title="Test connection (stub)">
                      Test connection
                    </Button>
                  </div>
                  {setupOpen === int.id && "setupSteps" in int && (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                      <p className="font-medium">Setup wizard (stub)</p>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {(int.setupSteps as string[]).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      <p className="text-muted-foreground pt-2">Mapping table UI would appear here.</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </PageLayout>
  );
}
