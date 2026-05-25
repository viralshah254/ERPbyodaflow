"use client";

import { useLayoutEffect } from "react";

const APP_SHELL_CLASS = "app-shell";

/** Locks document scroll for dashboard/platform shells with internal scroll regions. */
export function AppShellScrollLock() {
  useLayoutEffect(() => {
    document.documentElement.classList.add(APP_SHELL_CLASS);
    document.body.classList.add(APP_SHELL_CLASS);
    return () => {
      document.documentElement.classList.remove(APP_SHELL_CLASS);
      document.body.classList.remove(APP_SHELL_CLASS);
    };
  }, []);
  return null;
}
