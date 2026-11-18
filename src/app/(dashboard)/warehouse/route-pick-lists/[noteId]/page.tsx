"use client";

import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { JoyLoaderNote } from "@/components/warehouse/JoyRouteLoads";

export default function LoaderNotePage() {
  const params = useParams<{ noteId: string }>();
  const noteId = typeof params.noteId === "string" ? params.noteId : "";
  return (
    <PageShell>
      <JoyLoaderNote noteId={noteId} />
    </PageShell>
  );
}
