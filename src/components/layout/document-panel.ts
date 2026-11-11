"use client";

import { createContext, useSyncExternalStore } from "react";

const DOCKED_SUMMARY = "(min-width: 1440px)";

function subscribe(listener: () => void) {
  const query = window.matchMedia?.(DOCKED_SUMMARY);
  query?.addEventListener?.("change", listener);
  return () => query?.removeEventListener?.("change", listener);
}

export function useDockedDocumentSummary() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(DOCKED_SUMMARY).matches ?? false,
    () => false,
  );
}

export const DocumentSummaryDrawer = createContext(false);
