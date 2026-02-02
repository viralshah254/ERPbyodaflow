"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";

export default function OrganizationPage() {
  return (
    <PageLayout
      title="Organization Profile"
      description="Manage your organization details"
    >
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input id="name" defaultValue="Acme Manufacturing" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-id">Tax ID</Label>
            <Input id="tax-id" placeholder="Enter tax ID" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration">Registration Number</Label>
            <Input id="registration" placeholder="Enter registration number" />
          </div>
          <Button>
            <Icons.Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





