"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export interface DocumentComment {
  id: string;
  author: string;
  at: string;
  body: string;
}

interface DocumentCommentsProps {
  comments?: DocumentComment[];
  onAddComment?: (body: string) => void;
  className?: string;
}

/** Comments panel for document detail: timeline of comments + add form. */
export function DocumentComments({
  comments = [],
  onAddComment,
  className,
}: DocumentCommentsProps) {
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const handleSubmit = async () => {
    const t = draft.trim();
    if (!t) return;
    if (!onAddComment) {
      toast.success("Comment captured in demo mode.");
      setDraft("");
      return;
    }
    setPosting(true);
    try {
      await onAddComment(t);
      setDraft("");
    } catch (e) {
      toast.error((e as Error).message || "Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-2">
        <textarea
          placeholder="Add a comment..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          )}
        />
        <Button size="sm" onClick={() => void handleSubmit()} disabled={!draft.trim() || posting}>
          {posting ? "Posting…" : "Post"}
        </Button>
      </div>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c, i) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                {i < comments.length - 1 && <div className="w-px flex-1 min-h-[24px] bg-border" />}
              </div>
              <div className="pb-2">
                <p className="font-medium text-sm">{c.author}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.at).toLocaleString()}</p>
                <p className="text-sm mt-1">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
