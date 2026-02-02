"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";

export default function SecurityPage() {
  const securityFeatures = [
    {
      title: "Role-based access control",
      description:
        "Granular permissions ensure users only access what they need. Define roles and assign permissions at the organization, branch, or department level.",
      icon: Icons.Shield,
    },
    {
      title: "Audit logs",
      description:
        "Every action is logged with timestamps, user information, and context. Track changes, approvals, and access for compliance and security.",
      icon: Icons.FileText,
    },
    {
      title: "Data isolation",
      description:
        "Multi-tenant architecture ensures complete data isolation between organizations. Your data is never accessible to other tenants.",
      icon: Icons.Lock,
    },
    {
      title: "Encryption",
      description:
        "Data is encrypted at rest and in transit using industry-standard encryption. Your sensitive business data is protected.",
      icon: Icons.Key,
    },
  ];

  return (
    <div className="py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Enterprise-grade security</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your data is secure and compliant. We take security seriously.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {securityFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card key={i} className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>

        <Card className="max-w-3xl mx-auto p-8">
          <h2 className="text-2xl font-bold mb-4">Compliance & certifications</h2>
          <p className="text-muted-foreground mb-6">
            We maintain industry-standard certifications and comply with data protection
            regulations.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["SOC 2", "GDPR", "ISO 27001", "HIPAA"].map((cert) => (
              <div
                key={cert}
                className="p-4 border rounded-lg text-center text-sm font-medium"
              >
                {cert}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}





