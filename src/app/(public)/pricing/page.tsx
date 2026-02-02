"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";

export default function PricingPage() {
  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include core features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* Starter */}
          <Card className="p-8">
            <h3 className="text-2xl font-semibold mb-2">Starter</h3>
            <p className="text-muted-foreground mb-6">Perfect for small teams</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Up to 5 users</span>
              </li>
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
                <span className="text-sm">Email support</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/signup?plan=STARTER">Get started</Link>
            </Button>
          </Card>

          {/* Professional */}
          <Card className="p-8 border-primary">
            <div className="mb-4">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                POPULAR
              </span>
            </div>
            <h3 className="text-2xl font-semibold mb-2">Professional</h3>
            <p className="text-muted-foreground mb-6">For growing businesses</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Up to 25 users</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Everything in Starter</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Advanced reporting</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Priority support</span>
              </li>
            </ul>
            <Button className="w-full" asChild>
              <Link href="/signup?plan=PROFESSIONAL">Get started</Link>
            </Button>
          </Card>

          {/* Enterprise */}
          <Card className="p-8">
            <h3 className="text-2xl font-semibold mb-2">Enterprise</h3>
            <p className="text-muted-foreground mb-6">Custom solutions</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">Custom</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Unlimited users</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.Check className="h-5 w-5 text-primary" />
                <span className="text-sm">Everything in Professional</span>
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
                <span className="text-sm">Dedicated support</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/signup?plan=ENTERPRISE">Contact sales</Link>
            </Button>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I change plans later?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards and can arrange invoicing for Enterprise customers.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes, all plans include a 14-day free trial. No credit card required.",
              },
              {
                q: "What happens to my data if I cancel?",
                a: "You can export all your data at any time. We'll keep your data for 30 days after cancellation.",
              },
            ].map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}





