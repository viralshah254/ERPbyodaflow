"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const MOCK_COMMENTS: DocumentComment[] = [
  { id: "1", author: "Jane Doe", at: "2025-01-28T10:30:00Z", body: "Please double-check the delivery address before posting." },
  { id: "2", author: "John Smith", at: "2025-01-28T11:00:00Z", body: "Address confirmed. Ready to ship." },
];

/** Comments panel for document detail: timeline of comments + add form. */
export function DocumentComments({
  comments = MOCK_COMMENTS,
  onAddComment,
  className,
}: DocumentCommentsProps) {
  const [draft, setDraft] = React.useState("");

  const handleSubmit = () => {
    const t = draft.trim();
    if (!t) return;
    onAddComment?.(t);
    setDraft("");
    if (!onAddComment) window.alert("Add comment (stub): API pending.");
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
        <Button size="sm" onClick={handleSubmit} disabled={!draft.trim()}>
          Post
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
