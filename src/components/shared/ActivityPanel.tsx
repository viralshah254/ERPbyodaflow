"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";

export interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  detail?: string;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ActivityPanelProps {
  auditEntries?: AuditEntry[];
  comments?: Comment[];
  attachments?: Attachment[];
  onAddComment?: (text: string) => void;
  onAddAttachment?: () => void;
  className?: string;
}

export function ActivityPanel({
  auditEntries = [],
  comments = [],
  attachments = [],
  onAddComment,
  onAddAttachment,
  className,
}: ActivityPanelProps) {
  const [commentText, setCommentText] = React.useState("");

  const handleAddComment = () => {
    if (commentText.trim() && onAddComment) {
      onAddComment(commentText);
      setCommentText("");
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs defaultValue="audit" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="audit"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Icons.Clock className="mr-2 h-4 w-4" />
            Audit ({auditEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Icons.MessageSquare className="mr-2 h-4 w-4" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger
            value="attachments"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Icons.Paperclip className="mr-2 h-4 w-4" />
            Files ({attachments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {auditEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No audit entries yet.
                </p>
              ) : (
                auditEntries.map((e, i) => (
                  <div key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icons.Circle className="h-2 w-2" />
                      </div>
                      {i < auditEntries.length - 1 && (
                        <div className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium">{e.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.user} · {e.timestamp}
                      </p>
                      {e.detail && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {e.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="comments" className="flex-1 min-h-0 m-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet.
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded border p-3">
                    <p className="text-sm">{c.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.user} · {c.timestamp}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {onAddComment && (
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment}>
                <Icons.Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attachments" className="flex-1 min-h-0 m-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attachments yet.
                </p>
              ) : (
                attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icons.File className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.size} · {a.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Icons.Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {onAddAttachment && (
            <div className="p-4 border-t">
              <Button variant="outline" size="sm" onClick={onAddAttachment}>
                <Icons.Upload className="mr-2 h-4 w-4" />
                Upload file
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
