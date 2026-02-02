"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";

export default function PreferencesPage() {
  return (
    <PageLayout
      title="Preferences"
      description="Configure organization preferences"
    >
      <Card>
        <CardHeader>
          <CardTitle>Organization Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" defaultValue="KES" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" defaultValue="Africa/Nairobi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Input id="date-format" defaultValue="DD/MM/YYYY" />
          </div>
          <Button>
            <Icons.Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





