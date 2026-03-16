"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform settings</h1>
        <p className="text-muted-foreground">Configure platform and access the full control plane.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Full platform control plane</CardTitle>
          <CardDescription>
            The full platform UI (tenants, orgs, provisioning, audit) is also available under ERP Settings for users with platform permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/settings/platform">Open full platform settings (ERP)</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
