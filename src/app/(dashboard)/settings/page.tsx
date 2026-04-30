"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { SETTINGS_HUB_GROUPS } from "@/lib/settings/settings-hub-links";
import { canSeeHubItem } from "@/lib/settings/hub-permissions";
import * as Icons from "lucide-react";

function IconByName({ name, className }: { name: string; className?: string }) {
  const I =
    (Icons[name as keyof typeof Icons] as React.ComponentType<{ className?: string }> | undefined) ??
    Icons.Circle;
  return <I className={className} />;
}

export default function SettingsHubPage() {
  const permissions = useAuthStore((s) => s.permissions);

  const visibleGroups = React.useMemo(() => {
    return SETTINGS_HUB_GROUPS.map((g) => ({
      ...g,
      links: g.links.filter((l) => canSeeHubItem(permissions, l.requiresPermissions)),
    })).filter((g) => g.links.length > 0);
  }, [permissions]);

  const hasAnySettingsLink = visibleGroups.length > 0;

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Organization, financial, inventory, and access configuration"
        breadcrumbs={[{ label: "Settings" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-10">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Help</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/tutorial">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-2">
                  <div className="rounded-lg bg-muted p-2">
                    <IconByName name="BookOpen" className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Tutorial</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Guided walkthrough of OdaFlow</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {!hasAnySettingsLink ? (
          <p className="text-sm text-muted-foreground">
            You do not have access to configuration pages. Contact an administrator if you need changes.
          </p>
        ) : (
          visibleGroups.map((group) => (
            <section key={group.id}>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">{group.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader className="flex flex-row items-center gap-2">
                        <div className="rounded-lg bg-muted p-2">
                          <IconByName name={link.icon} className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-base">{link.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{link.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </PageShell>
  );
}
