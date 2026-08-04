import { create } from "zustand";
import { getProfileTools } from "@/lib/accessibility/profiles";
import {
  DEFAULT_TOOLS,
  DEFAULT_WIDGET,
  STORAGE_KEY,
  type AccessibilityPersistedState,
  type ProfileId,
  type TextAlignValue,
  type ToolSettings,
  type WidgetSettings,
} from "@/lib/accessibility/types";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

type AccessibilityState = AccessibilityPersistedState & {
  panelOpen: boolean;
  hydrated: boolean;
  setPanelOpen: (open: boolean) => void;
  applyProfile: (id: ProfileId) => void;
  clearProfile: () => void;
  setTool: <K extends keyof ToolSettings>(key: K, value: ToolSettings[K]) => void;
  toggleTool: (key: keyof Pick<ToolSettings, BooleanToolKeys>) => void;
  cycleStepTool: (key: "biggerText" | "lineHeight") => void;
  setSaturation: (value: number) => void;
  setTextAlign: (value: TextAlignValue) => void;
  setWidgetHidden: (hidden: boolean) => void;
  setWidgetPosition: (position: { x: number; y: number } | null) => void;
  toggleOversizedWidget: () => void;
  resetAll: () => void;
  hydrate: () => void;
  persist: () => void;
};

type BooleanToolKeys = {
  [K in keyof ToolSettings]: ToolSettings[K] extends boolean ? K : never;
}[keyof ToolSettings];

function loadState(): AccessibilityPersistedState {
  return loadStoredValue<AccessibilityPersistedState>(STORAGE_KEY, () => ({
    activeProfile: null,
    tools: { ...DEFAULT_TOOLS },
    widget: { ...DEFAULT_WIDGET },
  }));
}

function mergeTools(partial: Partial<ToolSettings>): ToolSettings {
  return { ...DEFAULT_TOOLS, ...partial };
}

function detectReducedMotionDefault(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  activeProfile: null,
  tools: { ...DEFAULT_TOOLS },
  widget: { ...DEFAULT_WIDGET },
  panelOpen: false,
  hydrated: false,

  setPanelOpen: (open) => set({ panelOpen: open }),

  applyProfile: (id) => {
    const tools = getProfileTools(id);
    set({ activeProfile: id, tools });
    get().persist();
  },

  clearProfile: () => {
    set({ activeProfile: null });
    get().persist();
  },

  setTool: (key, value) => {
    set((s) => ({
      activeProfile: null,
      tools: { ...s.tools, [key]: value },
    }));
    get().persist();
  },

  toggleTool: (key) => {
    set((s) => ({
      activeProfile: null,
      tools: { ...s.tools, [key]: !s.tools[key] },
    }));
    get().persist();
  },

  cycleStepTool: (key) => {
    set((s) => {
      const current = s.tools[key];
      const next = ((current + 1) % 3) as 0 | 1 | 2;
      return {
        activeProfile: null,
        tools: { ...s.tools, [key]: next },
      };
    });
    get().persist();
  },

  setSaturation: (value) => {
    const clamped = Math.max(0, Math.min(200, Math.round(value)));
    set((s) => ({
      activeProfile: null,
      tools: { ...s.tools, saturation: clamped },
    }));
    get().persist();
  },

  setTextAlign: (value) => {
    set((s) => ({
      activeProfile: null,
      tools: { ...s.tools, textAlign: value },
    }));
    get().persist();
  },

  setWidgetHidden: (hidden) => {
    set((s) => ({
      widget: { ...s.widget, hidden },
    }));
    get().persist();
  },

  setWidgetPosition: (position) => {
    set((s) => ({
      widget: { ...s.widget, position },
    }));
    get().persist();
  },

  toggleOversizedWidget: () => {
    set((s) => ({
      widget: { ...s.widget, oversized: !s.widget.oversized },
      tools: { ...s.tools, oversizedWidget: !s.tools.oversizedWidget },
    }));
    get().persist();
  },

  resetAll: () => {
    const pauseAnimations = detectReducedMotionDefault();
    set({
      activeProfile: null,
      tools: { ...DEFAULT_TOOLS, pauseAnimations },
      widget: { ...DEFAULT_WIDGET },
      panelOpen: false,
    });
    get().persist();
  },

  hydrate: () => {
    const stored = loadState();
    const pauseAnimations =
      stored.tools.pauseAnimations || detectReducedMotionDefault();
    set({
      activeProfile: stored.activeProfile,
      tools: mergeTools({ ...stored.tools, pauseAnimations }),
      widget: { ...DEFAULT_WIDGET, ...stored.widget },
      hydrated: true,
    });
  },

  persist: () => {
    const { activeProfile, tools, widget } = get();
    saveStoredValue(STORAGE_KEY, { activeProfile, tools, widget });
  },
}));
