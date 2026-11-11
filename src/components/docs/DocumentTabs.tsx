"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const DOC_TAB_IDS = ["lines", "taxes", "attachments", "comments", "approval", "audit"] as const;

interface DocumentTabsProps {
  compact?: boolean;
  detailsOnly?: boolean;
  defaultTab?: (typeof DOC_TAB_IDS)[number];
  lines: React.ReactNode;
  taxes?: React.ReactNode;
  attachments?: React.ReactNode;
  comments?: React.ReactNode;
  approval?: React.ReactNode;
  audit?: React.ReactNode;
}

/** Standard document detail tabs: Lines, Taxes/Charges, Attachments, Comments, Approval, Audit. */
export function DocumentTabs({
  defaultTab = "lines",
  compact = false,
  detailsOnly = false,
  lines,
  taxes,
  attachments,
  comments,
  approval,
  audit,
}: DocumentTabsProps) {
  const tabs = (
    <Tabs defaultValue={detailsOnly ? "taxes" : defaultTab} className="w-full">
      <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1">
        {!detailsOnly && <TabsTrigger value="lines">Lines</TabsTrigger>}
        <TabsTrigger value="taxes">Taxes/Charges</TabsTrigger>
        <TabsTrigger value="attachments">Attachments</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="approval">Approval</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
      </TabsList>
      {!detailsOnly && <TabsContent value="lines" className={compact ? "mt-2" : "mt-4"}>
        {lines}
      </TabsContent>}
      <TabsContent value="taxes" className="mt-4">
        {taxes ?? <div className="rounded border p-4 text-sm text-muted-foreground">Taxes and charges will appear here for this document.</div>}
      </TabsContent>
      <TabsContent value="attachments" className="mt-4">
        {attachments ?? <div className="rounded border p-4 text-sm text-muted-foreground">Attachments will appear here when files are added.</div>}
      </TabsContent>
      <TabsContent value="comments" className="mt-4">
        {comments ?? <div className="rounded border p-4 text-sm text-muted-foreground">Comments and collaboration notes will appear here.</div>}
      </TabsContent>
      <TabsContent value="approval" className="mt-4">
        {approval ?? <div className="rounded border p-4 text-sm text-muted-foreground">Approval history will appear here once actions are taken.</div>}
      </TabsContent>
      <TabsContent value="audit" className="mt-4">
        {audit ?? <div className="rounded border p-4 text-sm text-muted-foreground">Audit events will appear here as the document changes.</div>}
      </TabsContent>
    </Tabs>
  );
  return detailsOnly ? (
    <details className="rounded-md border bg-card px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">Taxes, attachments, comments and audit</summary>
      <div className="mt-2">{tabs}</div>
    </details>
  ) : tabs;
}
