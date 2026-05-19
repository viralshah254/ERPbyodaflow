"use client";

import { useEffect, useState } from "react";
import { fetchCoolcatchReadiness, type CoolcatchReadinessReport } from "@/lib/api/coolcatch-gap";

export default function CoolcatchReadinessPage() {
  const [report, setReport] = useState<CoolcatchReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCoolcatchReadiness()
      .then(setReport)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">CoolCatch template readiness</h1>
      <p className="text-sm text-muted-foreground">
        Validates template flags, master data, outlets, and franchise coordinates for go-live.
      </p>
      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {report && (
        <>
          <div
            className={`rounded-lg border p-4 ${
              report.ready ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="font-medium">{report.orgName}</p>
            <p className="text-sm text-muted-foreground">
              {report.templateId} · {report.ready ? "Ready" : "Not ready"}
            </p>
          </div>
          <ul className="space-y-2">
            {report.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm border rounded-md p-3">
                <span
                  className={
                    c.status === "ok"
                      ? "text-green-600"
                      : c.status === "warn"
                        ? "text-amber-600"
                        : "text-red-600"
                  }
                >
                  {c.status.toUpperCase()}
                </span>
                <span>{c.message}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
