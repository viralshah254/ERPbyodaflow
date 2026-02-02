"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const DOC_TAB_IDS = ["lines", "taxes", "attachments", "comments", "approval", "audit"] as const;

interface DocumentTabsProps {
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
  lines,
  taxes,
  attachments,
  comments,
  approval,
  audit,
}: DocumentTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1">
        <TabsTrigger value="lines">Lines</TabsTrigger>
        <TabsTrigger value="taxes">Taxes/Charges</TabsTrigger>
        <TabsTrigger value="attachments">Attachments</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="approval">Approval</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
      </TabsList>
      <TabsContent value="lines" className="mt-4">
        {lines}
      </TabsContent>
      <TabsContent value="taxes" className="mt-4">
        {taxes ?? <div className="rounded border p-4 text-sm text-muted-foreground">Taxes & charges (stub)</div>}
      </TabsContent>
      <TabsContent value="attachments" className="mt-4">
        {attachments ?? <div className="rounded border p-4 text-sm text-muted-foreground">Attachments (stub)</div>}
      </TabsContent>
      <TabsContent value="comments" className="mt-4">
        {comments ?? <div className="rounded border p-4 text-sm text-muted-foreground">Comments (stub)</div>}
      </TabsContent>
      <TabsContent value="approval" className="mt-4">
        {approval ?? <div className="rounded border p-4 text-sm text-muted-foreground">Approval history (stub)</div>}
      </TabsContent>
      <TabsContent value="audit" className="mt-4">
        {audit ?? <div className="rounded border p-4 text-sm text-muted-foreground">Audit log (stub)</div>}
      </TabsContent>
    </Tabs>
  );
}
