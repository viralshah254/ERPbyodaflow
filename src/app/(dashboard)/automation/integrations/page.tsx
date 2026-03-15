"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiRequest, isApiConfigured } from "@/lib/api/client";

type IntegrationStatus = "connected" | "disconnected";
type IntegrationHealth = "healthy" | "attention" | "idle";

type IntegrationItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: IntegrationStatus;
  health: IntegrationHealth;
  configured: boolean;
  lastSyncAt: string | null;
  setupSteps: string[];
};

const FALLBACK_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "vmi-webhook",
    name: "VMI ingest",
    description: "Receive outlet stock and sales feeds from external producers",
    icon: "PackagePlus",
    status: "disconnected",
    health: "idle",
    configured: false,
    lastSyncAt: null,
    setupSteps: [
      "Configure webhook shared secret",
      "Allow producer identifiers",
      "Send a signed stock snapshot test payload",
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Inbound order and support webhook for command processing",
    icon: "MessageCircle",
    status: "disconnected",
    health: "idle",
    configured: false,
    lastSyncAt: null,
    setupSteps: [
      "Set webhook verify token",
      "Point Meta webhook to the backend endpoint",
      "Complete a challenge and send a test message",
    ],
  },
  {
    id: "accounting-exports",
    name: "Accounting exports",
    description: "Export commission, tax, and finance data to external ledgers",
    icon: "Calculator",
    status: "disconnected",
    health: "idle",
    configured: false,
    lastSyncAt: null,
    setupSteps: [
      "Choose an export format",
      "Map ledger accounts",
      "Schedule outbound jobs",
    ],
  },
];

function integrationIcon(id: string): string {
  switch (id) {
    case "vmi-webhook":
      return "PackagePlus";
    case "whatsapp":
      return "MessageCircle";
    default:
      return "Calculator";
  }
}

function renderHealthLabel(health: IntegrationHealth): string {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "attention":
      return "Needs attention";
    default:
      return "Idle";
  }
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = React.useState<IntegrationItem[]>(
    FALLBACK_INTEGRATIONS
  );
  const [setupOpen, setSetupOpen] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(isApiConfigured());

  const loadIntegrations = React.useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest<{
        items: Array<Omit<IntegrationItem, "icon">>;
      }>("/api/automation/integrations");
      setIntegrations(
        response.items.map((item) => ({
          ...item,
          icon: integrationIcon(item.id),
        }))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load integrations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  return (
    <PageLayout
      title="Integrations"
      description="Review live integration status and setup readiness"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading integration status...
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const IconComponent =
            (Icons[
              integration.icon as keyof typeof Icons
            ] || Icons.Plug) as React.ComponentType<{ className?: string }>;

          return (
            <Card key={integration.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {integration.name}
                    </CardTitle>
                    <CardDescription>
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      integration.status === "connected" ? "default" : "outline"
                    }
                  >
                    {integration.status === "connected"
                      ? "Connected"
                      : "Not connected"}
                  </Badge>
                  <Badge
                    variant={
                      integration.health === "attention"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {renderHealthLabel(integration.health)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSetupOpen(
                        setupOpen === integration.id ? null : integration.id
                      )
                    }
                  >
                    {integration.status === "connected" ? "Details" : "Setup"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void loadIntegrations()}
                    disabled={loading || !isApiConfigured()}
                  >
                    Refresh
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {integration.lastSyncAt
                    ? `Last activity: ${new Date(
                        integration.lastSyncAt
                      ).toLocaleString()}`
                    : integration.configured
                      ? "Configured and waiting for activity."
                      : "Configuration is still incomplete."}
                </p>
                {setupOpen === integration.id ? (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                    <p className="font-medium">Setup checklist</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {integration.setupSteps.map((step, index) => (
                        <li key={`${integration.id}-${index}`}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageLayout>
  );
}
