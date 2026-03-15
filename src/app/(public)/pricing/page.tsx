"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";

/** Published pricing (per user per month, franchise, Copilot). Keep in sync with backend billing. */
const PRICING = {
  standardPerUserPerMonth: 35,
  franchiseBasePerMonth: 50,
  franchiseIncludedLicenses: 2,
  franchiseAdditionalUserPerMonth: 25,
  copilotPerUserPerMonth: 5,
  annualDiscountPercent: 20,
} as const;

export default function PricingPage() {
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  const annualMultiplier = 1 - PRICING.annualDiscountPercent / 100;

  const price = (monthly: number) =>
    billing === "monthly" ? monthly : Math.round(monthly * annualMultiplier * 100) / 100;

  return (
    <div className="py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, per-user pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay for the users you need. Add more anytime—billing is prorated to the last day of the month. No hidden fees.
          </p>
          <div className="mt-6 inline-flex rounded-lg border p-1 bg-background">
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium ${billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium ${billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setBilling("annual")}
            >
              Annual ({PRICING.annualDiscountPercent}% off)
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Annual billing is charged yearly; we bill on the last day of each month for that month. New users are prorated immediately.
          </p>
        </div>

        {/* Standard (direct) orgs */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold mb-2">Standard organizations</h2>
          <p className="text-muted-foreground mb-6">
            For manufacturers, distributors, and shops running on a single tenant.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 border-primary shadow-lg shadow-primary/10">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold">${price(PRICING.standardPerUserPerMonth)}</span>
                <span className="text-muted-foreground">/ user / month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Core ERP: inventory, sales, purchasing, finance, multi-branch, audit.
              </p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary shrink-0" />
                  Add or remove users anytime; billing updates immediately with prorated charges
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary shrink-0" />
                  Invoiced on the last day of each month for that month
                </li>
              </ul>
              <Button className="w-full" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </Card>
            <Card className="p-8 bg-muted/30">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold">+${price(PRICING.copilotPerUserPerMonth)}</span>
                <span className="text-muted-foreground">/ user / month</span>
              </div>
              <p className="text-sm font-medium mb-1">Copilot add-on</p>
              <p className="text-sm text-muted-foreground mb-6">
                Enable AI-assisted queries and actions per user. Only pay for users with Copilot on.
              </p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary shrink-0" />
                  Sales, inventory, AR/AP, and approval suggestions
                </li>
                <li className="flex items-center gap-2">
                  <Icons.Check className="h-4 w-4 text-primary shrink-0" />
                  Toggle per user; billed with your monthly subscription
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">Add Copilot from user settings after signup.</p>
            </Card>
          </div>
        </div>

        {/* Franchise */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold mb-2">Franchise operations</h2>
          <p className="text-muted-foreground mb-6">
            For franchisors and franchisees: base fee per franchisee plus low-cost additional seats.
          </p>
          <Card className="p-8 border-2 border-primary/30">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Per franchisee / month</p>
                <p className="text-3xl font-bold">${price(PRICING.franchiseBasePerMonth)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Includes {PRICING.franchiseIncludedLicenses} user licenses
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Additional users</p>
                <p className="text-3xl font-bold">${price(PRICING.franchiseAdditionalUserPerMonth)}</p>
                <p className="text-sm text-muted-foreground mt-1">per user / month</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Copilot (optional)</p>
                <p className="text-3xl font-bold">+${price(PRICING.copilotPerUserPerMonth)}</p>
                <p className="text-sm text-muted-foreground mt-1">per user / month when enabled</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Same billing rules: last day of month, prorated when you add users or enable Copilot mid-cycle.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/signup?plan=FRANCHISE">Request franchise setup</Link>
            </Button>
          </Card>
        </div>

        {/* No hidden fees + billing rules */}
        <Card className="max-w-4xl mx-auto p-6 mb-16 bg-muted/30">
          <h2 className="text-xl font-semibold mb-3">No hidden fees · Billing rules</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Icons.Calendar className="h-4 w-4 text-primary shrink-0" />
              We bill on the <strong className="text-foreground">last day of each month</strong> for that month.
            </li>
            <li className="flex items-center gap-2">
              <Icons.UserPlus className="h-4 w-4 text-primary shrink-0" />
              When you add users (or enable Copilot for a user), we charge a <strong className="text-foreground">prorated amount immediately</strong> for the remainder of the current month, then include them in the next full month&apos;s invoice.
            </li>
            <li className="flex items-center gap-2">
              <Icons.Receipt className="h-4 w-4 text-primary shrink-0" />
              All recurring fees are shown in-product and on your invoice. Optional add-ons (e.g. Copilot, extra integrations) are always listed and agreed before charge.
            </li>
          </ul>
        </Card>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "When am I charged when I add a new user?",
                a: "You're charged a prorated amount right away for the rest of the current month. From the next month, that user is included in your regular invoice (last day of month).",
              },
              {
                q: "How does franchise pricing work?",
                a: "Each franchisee is $50/month (or the annual equivalent) and includes 2 user licenses. Every user beyond that is $25/user/month. Copilot is an extra $5/user/month when enabled for that user.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept major credit cards. Enterprise and franchise customers can request invoicing with net terms.",
              },
              {
                q: "Is there an annual discount?",
                a: "Yes. Pay annually and save 20% on the monthly equivalent across standard and franchise pricing.",
              },
              {
                q: "Are there any hidden platform or per-transaction fees?",
                a: "No. Your subscription covers hosting, updates, and core support. Only explicitly agreed add-ons (e.g. Copilot per user) are added to your bill.",
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
