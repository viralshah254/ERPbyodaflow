"use client";

import * as React from "react";
import { fetchApiBinary } from "@/lib/api/client";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";

export function DocumentHubPreview({
  fileId,
  fileName,
  contentType,
}: {
  fileId: string;
  fileName: string;
  contentType?: string;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<string>(contentType ?? "");
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    void fetchApiBinary(`/api/document-hub/files/${fileId}`).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setFailed(true);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setKind(blob.type || contentType || "");
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contentType, fileId]);

  const image = kind.startsWith("image/");
  const pdf = kind.includes("pdf");

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="relative bg-muted/40">
        <TableLinearProgress active={!url && !failed} />
        {!url && !failed ? <div className="h-64" /> : null}
        {failed ? <p className="p-6 text-sm text-muted-foreground">The original file could not be previewed.</p> : null}
        {url && image ? <img src={url} alt={fileName} className="mx-auto max-h-80 w-full object-contain" /> : null}
        {url && pdf ? <iframe title={fileName} src={url} className="h-80 w-full bg-white" /> : null}
        {url && !image && !pdf ? (
          <a href={url} target="_blank" rel="noreferrer" className="block p-6 text-sm underline">
            Open {fileName}
          </a>
        ) : null}
      </div>
      <p className="truncate border-t px-3 py-2 text-xs text-muted-foreground">{fileName}</p>
    </div>
  );
}
