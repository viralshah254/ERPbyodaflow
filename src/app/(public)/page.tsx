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
  const [demoModalOpen, setDemoModalOpen] = React.useState(false);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <GradientBlob />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                The ERP built for trade in the real world.
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                Manufacturers, distributors, and shops—connected with inventory,
                orders, finance, and AI insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">Start Free</Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setDemoModalOpen(true)}>
                  <Icons.Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              <AppFrame>
                <div className="p-8 bg-muted/30 min-h-[400px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <div className="text-2xl font-bold text-green-600">↓ 23%</div>
                        <div className="text-xs text-muted-foreground">Stockouts</div>
                      </div>
                      <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">↑ 18%</div>
                        <div className="text-xs text-muted-foreground">Collections</div>
                      </div>
                      <div className="bg-background rounded-lg p-4 border shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">↑ 12%</div>
                        <div className="text-xs text-muted-foreground">Fill Rate</div>
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
            Trusted by teams across manufacturing, distribution, retail
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
                  Process orders, manage inventory, and get approvals faster. Real-time
                  updates keep everyone aligned.
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
                  Track stock levels, deliveries, and collections across all branches.
                  Know what&apos;s happening, when it&apos;s happening.
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
                  Get intelligent suggestions for reordering, anomaly detection, and
                  automated summaries. AI that actually helps.
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
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-8">
              <h3 className="text-2xl font-semibold mb-2">Standard</h3>
              <p className="text-muted-foreground mb-6">
                Everything you need to get started
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Industry templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Core modules</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Standard support</span>
                </li>
              </ul>
            </Card>
            <Card className="p-8 border-primary">
              <div className="mb-4">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                  ENTERPRISE
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Enterprise</h3>
              <p className="text-muted-foreground mb-6">
                Customization, workflows, and advanced features
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Everything in Standard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Custom fields & workflows</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Advanced RBAC</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">View Pricing</Link>
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





