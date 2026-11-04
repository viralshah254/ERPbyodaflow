"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { PageHelp } from "./PageHelp";
import { useAuthStore } from "@/stores/auth-store";
import { resolveScreenGuide } from "@/lib/tutorial/screen-guides";

/** Also covers workspaces that use a custom header instead of PageHeader. */
export function PageHelpFallback() {
  const pathname = usePathname() || "/";
  const ready = useAuthStore(s => !s.isLoading && !!s.user);
  const [missing, setMissing] = React.useState(false);
  React.useEffect(() => {
    const root = document.querySelector("[data-tutorial-hint=page-main]");
    if (!root) return;
    const inspect = () => setMissing(!root.querySelector("[data-page-help]"));
    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, ready]);
  if (!ready || !missing || !resolveScreenGuide(pathname)) return null;
  return <div className="flex shrink-0 justify-end border-b bg-card px-4 py-2"><PageHelp compact /></div>;
}
