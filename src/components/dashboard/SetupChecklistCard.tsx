"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import * as Icons from "lucide-react";

const CHECKLIST_KEY = "odaflow_setup_checklist";

const STEPS: { id: string; label: string; href: string }[] = [
  { id: "company", label: "Company setup", href: "/settings/org" },
  { id: "currencies", label: "Currencies", href: "/settings/financial/currencies" },
  { id: "coa", label: "Chart of Accounts", href: "/settings/financial/chart-of-accounts" },
  { id: "taxes", label: "Taxes", href: "/settings/financial/taxes" },
  { id: "bank", label: "Bank accounts", href: "/treasury/bank-accounts" },
  { id: "invite", label: "Invite users", href: "/settings/users-roles" },
  { id: "first-doc", label: "Create first doc", href: "/docs" },
];

function getCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function setCompleted(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function SetupChecklistCard() {
  const [completed, setCompletedState] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setCompletedState(getCompleted());
  }, []);

  const toggle = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompletedState(next);
    setCompleted(next);
  };

  const done = completed.size;
  const total = STEPS.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icons.ClipboardCheck className="h-4 w-4" />
          Setup checklist
        </CardTitle>
        <CardDescription>
          {done} of {total} complete. Guided onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {STEPS.map((step) => {
            const isDone = completed.has(step.id);
            return (
              <li key={step.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(step.id)}
                  className="shrink-0 rounded border p-0.5 hover:bg-muted"
                  aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                >
                  {isDone ? (
                    <Icons.CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Icons.Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <Link
                  href={step.href}
                  className="flex-1 text-sm hover:underline"
                >
                  {step.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Setup guide <Icons.ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/signup/onboarding"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Full onboarding (signup)
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
