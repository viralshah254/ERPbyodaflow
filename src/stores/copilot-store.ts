"use client";

import { create } from "zustand";
import type { CopilotAction } from "@/types/copilotActions";

interface CopilotState {
  drawerOpen: boolean;
  pendingAction: CopilotAction | null;
  /** Prefill prompt when opening chat (e.g. from ExplainThis). Cleared after consumed. */
  prefillPrompt: string | null;
  setDrawerOpen: (open: boolean) => void;
  setPendingAction: (action: CopilotAction | null) => void;
  setPrefillPrompt: (prompt: string | null) => void;
  openDrawer: () => void;
  openDrawerWithPrompt: (prompt: string) => void;
  openDrawerWithAction: (action: CopilotAction) => void;
  closeDrawer: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  drawerOpen: false,
  pendingAction: null,
  prefillPrompt: null,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setPendingAction: (action) => set({ pendingAction: action }),
  setPrefillPrompt: (prompt) => set({ prefillPrompt: prompt }),
  openDrawer: () => set({ drawerOpen: true }),
  openDrawerWithPrompt: (prompt) =>
    set({ drawerOpen: true, prefillPrompt: prompt }),
  openDrawerWithAction: (action) =>
    set({ drawerOpen: true, pendingAction: action }),
  closeDrawer: () =>
    set({ drawerOpen: false, pendingAction: null, prefillPrompt: null }),
}));
