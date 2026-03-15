"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppFrame } from "@/components/marketing/app-frame";
import { GradientBlob } from "@/components/marketing/gradient-blob";
import * as Icons from "lucide-react";
import { INDUSTRY_TEMPLATES } from "@/config/industryTemplates";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <GradientBlob />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-5 text-xs text-muted-foreground">
                <Icons.Sparkles className="h-3.5 w-3.5 text-primary" />
                Purpose-built ERP for high-velocity trade teams
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Run operations, finance, and AI workflows in one control tower.
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                OdaFlow connects inventory, purchasing, sales, treasury, payroll, and Copilot so your teams move faster without losing control.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">Request Setup</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">See Pricing</Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <Card className="p-3 bg-background/70">
                  <p className="text-xl font-semibold">99.9%</p>
                  <p className="text-xs text-muted-foreground">Platform uptime target</p>
                </Card>
                <Card className="p-3 bg-background/70">
                  <p className="text-xl font-semibold">&lt; 3 min</p>
                  <p className="text-xs text-muted-foreground">Average approval turnaround</p>
                </Card>
                <Card className="p-3 bg-background/70">
                  <p className="text-xl font-semibold">24/7</p>
                  <p className="text-xs text-muted-foreground">Audit and trace visibility</p>
                </Card>
              </div>
            </div>
            <div className="relative">
              <AppFrame>
                <div className="p-8 bg-muted/30 min-h-[400px] flex items-center justify-center">
                  <div className="w-full space-y-4">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-xs text-muted-foreground mb-2">Copilot brief</p>
                      <p className="text-sm font-medium mb-2">Show me sales for 2026-03-14 by branch</p>
                      <p className="text-xs text-emerald-500">Done. Revenue $186,240 · 5 branches · 2 anomalies detected</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <div className="text-2xl font-bold text-green-600">-23%</div>
                        <div className="text-xs text-muted-foreground">Stockout incidents</div>
                      </div>
                      <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">+18%</div>
                        <div className="text-xs text-muted-foreground">Collections velocity</div>
                      </div>
                      <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">+12%</div>
                        <div className="text-xs text-muted-foreground">Fill rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AppFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-b bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Built for ambitious teams across manufacturing, distribution, and retail
          </p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-24 bg-muted rounded flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">Logo {i}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Operational speed</h2>
                <p className="text-lg text-muted-foreground mb-6">
                Process orders, replenish stock, reconcile treasury, and close books faster with role-aware workflows and live approvals.
                </p>
                <Link
                  href="/features"
                  className="text-primary hover:underline font-medium"
                >
                  Learn more →
                </Link>
              </div>
              <AppFrame>
                <div className="p-8 bg-muted/30 min-h-[300px]" />
              </AppFrame>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AppFrame className="lg:order-1">
                <div className="p-8 bg-muted/30 min-h-[300px]" />
              </AppFrame>
              <div className="lg:order-2">
                <h2 className="text-3xl font-bold mb-4">Visibility end-to-end</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  One live command center for inventory, sales, purchasing, AR/AP, and branch performance with traceable decisions.
                </p>
                <Link
                  href="/features"
                  className="text-primary hover:underline font-medium"
                >
                  Learn more →
                </Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">AI that drives action</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Copilot answers business questions, drafts safe actions, and keeps audit context so teams act quickly with confidence.
                </p>
                <Link
                  href="/features"
                  className="text-primary hover:underline font-medium"
                >
                  Learn more →
                </Link>
              </div>
              <AppFrame>
                <div className="p-8 bg-muted/30 min-h-[300px]" />
              </AppFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Choose your industry</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Templates tailored to your business type with the right terminology and
              workflows from day one.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.values(INDUSTRY_TEMPLATES).map((template) => {
              const IconComponent = (Icons[template.icon as keyof typeof Icons] || Icons.Box) as React.ComponentType<{ className?: string }>;
              return (
                <Card
                  key={template.orgType}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="mb-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/signup?orgType=${template.orgType}`}>
                      Set up as {template.name}
                    </Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, per-user pricing. No hidden fees.</h2>
            <p className="text-lg text-muted-foreground">
              Add users anytime; we bill on the last day of each month with prorated charges.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-8">
              <h3 className="text-2xl font-semibold mb-2">Standard</h3>
              <p className="text-muted-foreground mb-6">
                Per user per month. Copilot optional per user.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$35</span>
                <span className="text-muted-foreground">/ user / month</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary" />
                  Core ERP: inventory, sales, finance, multi-branch
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary" />
                  +$5/user/month for Copilot when enabled
                </li>
              </ul>
            </Card>
            <Card className="p-8 border-primary shadow-lg shadow-primary/10">
              <h3 className="text-2xl font-semibold mb-2">Franchise</h3>
              <p className="text-muted-foreground mb-6">
                Per franchisee: base + additional seats.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$50</span>
                <span className="text-muted-foreground">/ franchisee / month</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary" />
                  2 licenses included; $25 per additional user
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary" />
                  Copilot +$5/user/month when enabled
                </li>
              </ul>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">View full pricing & billing rules</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Security Teaser */}
      <section className="py-24 lg:py-32 bg-muted/30 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Icons.Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-3xl font-bold mb-4">Enterprise-grade security</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Audit logs, role-based access control, permissioning, and data isolation.
              Your data is secure and compliant.
            </p>
            <Button variant="outline" asChild>
              <Link href="/security">Learn about security</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}





