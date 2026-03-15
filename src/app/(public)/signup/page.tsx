"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppFrame } from "@/components/marketing/app-frame";
import * as Icons from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Organization setup is assisted</h1>
              <p className="text-muted-foreground">
                New tenants and the first admin account are provisioned by OdaFlow or your
                platform administrator. Self-serve signup is not enabled in this deployment.
              </p>
            </div>

            <Card className="p-6 space-y-4">
              <div className="flex gap-3">
                <Icons.Building2 className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Need a new organization like `Top Food Ea Ltd` created? Use the platform
                  administration workflow to provision the tenant, branch, roles, and first user.
                </p>
              </div>
              <div className="flex gap-3">
                <Icons.ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Existing users can sign in once Firebase web keys and backend auth are
                  configured for this environment.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild>
                  <Link href="/login">Go to sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/features">Explore features</Link>
                </Button>
              </div>
            </Card>
          </div>

          <div className="hidden lg:block">
            <AppFrame>
              <div className="p-8 bg-muted/30 min-h-[500px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Icons.Box className="h-16 w-16 mx-auto text-primary" />
                  <h3 className="text-xl font-semibold">ERP by OdaFlow</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Provision manufacturers, distributors, and retail orgs with controlled
                    onboarding instead of browser-only demo accounts.
                  </p>
                </div>
              </div>
            </AppFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
