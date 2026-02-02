import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  commandPaletteOpen: boolean;
  theme: "light" | "dark" | "system";
  notifications: Notification[];
  /** Persisted: compact mode toggle */
  compactMode: boolean;

  setCommandPaletteOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setCompactMode: (v: boolean) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
}

const compactFromStorage =
  typeof window !== "undefined" ? localStorage.getItem("odaflow_compact_mode") === "true" : false;
const rightPanelFromStorage =
  typeof window !== "undefined"
    ? (() => {
        const v = localStorage.getItem("odaflow_right_panel");
        return v === null ? true : v === "true";
      })()
    : true;

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  rightPanelOpen: rightPanelFromStorage,
  commandPaletteOpen: false,
  theme: "system",
  notifications: [],
  compactMode: compactFromStorage,

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setRightPanelOpen: (open) => {
    set({ rightPanelOpen: open });
    if (typeof window !== "undefined") localStorage.setItem("odaflow_right_panel", String(open));
  },
  toggleRightPanel: () => set((s) => {
    const next = !s.rightPanelOpen;
    if (typeof window !== "undefined") localStorage.setItem("odaflow_right_panel", String(next));
    return { rightPanelOpen: next };
  }),
  setTheme: (theme) => set({ theme }),
  setCompactMode: (v) => {
    set({ compactMode: v });
    if (typeof window !== "undefined") localStorage.setItem("odaflow_compact_mode", String(v));
  },
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

