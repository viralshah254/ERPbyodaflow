"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";

interface NextStepsPanelProps {
  items: string[];
  /** Optional { label, href } for actionable steps */
  actions?: { label: string; href: string }[];
}

/** Recommended next steps in document right panel. */
export function NextStepsPanel({ items = [], actions = [] }: NextStepsPanelProps) {
  return (
    <div>
      <p className="font-medium text-sm mb-2">Recommended next steps</p>
      {items.length === 0 && actions.length === 0 ? (
        <p className="text-muted-foreground text-sm">None.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <Icons.ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              {s}
            </li>
          ))}
          {actions.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="text-primary hover:underline flex items-center gap-2"
              >
                <Icons.ArrowRight className="h-4 w-4 shrink-0" />
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
