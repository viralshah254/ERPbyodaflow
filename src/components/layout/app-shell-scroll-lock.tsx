"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const APP_SHELL_CLASS = "app-shell";

function resetDocumentScroll() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.getElementById("app-root")?.scrollTo(0, 0);
}

/** Locks document scroll for dashboard/platform shells with internal scroll regions. */
export function AppShellScrollLock() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    document.documentElement.classList.add(APP_SHELL_CLASS);
    document.body.classList.add(APP_SHELL_CLASS);
    resetDocumentScroll();
    return () => {
      document.documentElement.classList.remove(APP_SHELL_CLASS);
      document.body.classList.remove(APP_SHELL_CLASS);
      resetDocumentScroll();
    };
  }, []);

  useLayoutEffect(() => {
    resetDocumentScroll();
  }, [pathname]);

  return null;
}
