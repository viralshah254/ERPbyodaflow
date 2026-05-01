"use client";

import Link from "next/link";

type StatementPeriodStatusProps = {
  loading: boolean;
  errorMessage: string | null;
  periodsEmpty: boolean;
};

/** Inline messages when fiscal periods fail to load or none exist (Financial Statements pages). */
export function StatementPeriodStatus({ loading, errorMessage, periodsEmpty }: StatementPeriodStatusProps) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading fiscal periods…
      </p>
    );
  }
  if (errorMessage) {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        {errorMessage}
      </div>
    );
  }
  if (periodsEmpty) {
    return (
      <div className="rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <p>
          No fiscal periods are configured for this organization yet. Create periods under{" "}
          <Link href="/finance/period-close" className="font-medium text-primary underline underline-offset-4">
            Period Close
          </Link>
          {" "}(requires Period Close permission), or ask an administrator.
        </p>
      </div>
    );
  }
  return null;
}
