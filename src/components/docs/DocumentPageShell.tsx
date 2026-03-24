"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStatusBar } from "./DocumentStatusBar";
import { DocumentRightPanel } from "./DocumentRightPanel";
import { useUIStore } from "@/stores/ui-store";
import type { DocumentStatusActor } from "@/lib/types/documents";

interface DocumentPageShellProps {
  title: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  status?: string;
  statusActor?: DocumentStatusActor | null;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

/** Unified document view layout: header + status bar + main + optional right panel. */
export function DocumentPageShell({
  title,
  breadcrumbs,
  actions,
  status,
  statusActor,
  rightSlot,
  children,
}: DocumentPageShellProps) {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  return (
    <PageShell rightSlot={rightSlot}>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        actions={actions}
        sticky
        showCommandHint
        showRightPanelToggle={!!rightSlot}
      />
      {status != null && <DocumentStatusBar status={status} statusActor={statusActor} />}
      <div className="flex-1 p-6">{children}</div>
    </PageShell>
  );
}
