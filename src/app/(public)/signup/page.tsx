"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppFrame } from "@/components/marketing/app-frame";
import { OdaLogo } from "@/components/brand/OdaLogo";
import { ODA_BRAND } from "@/lib/brand";
import * as Icons from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <div className="mb-8">
              <div className="mb-6">
                <OdaLogo height={40} />
              </div>
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
              <div
                className="flex min-h-[500px] items-center justify-center p-8"
                style={{ backgroundColor: ODA_BRAND.navy }}
              >
                <div className="max-w-sm space-y-4 text-center">
                  <OdaLogo height={56} className="mx-auto max-w-[min(100%,280px)]" />
                  <p className="text-sm text-white/85">
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
