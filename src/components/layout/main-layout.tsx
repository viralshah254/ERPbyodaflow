"use client";

import { AppSidebar } from "@/components/nav/AppSidebar";
import { Header } from "./header";
import { CommandPalette } from "@/components/command/CommandPalette";
import { useUIStore } from "@/stores/ui-store";
import { useCopilotStore } from "@/stores/copilot-store";
import { useAuthStore } from "@/stores/auth-store";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { toast } from "sonner";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore();
  const {
    drawerOpen,
    setDrawerOpen,
    pendingAction,
    setPendingAction,
    prefillPrompt,
    setPrefillPrompt,
  } = useCopilotStore();
  const { currentBranch } = useAuthStore();

  const contextPills = [
    ...(currentBranch ? [{ label: "Branch", value: currentBranch.name }] : []),
    { label: "Period", value: "Jan 2025" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <AppSidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette />
      <CopilotDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        contextPills={contextPills}
        pendingAction={pendingAction}
        onApplyAction={() => {
          toast.success("Action applied (stub). API pending.");
          setPendingAction(null);
        }}
        onRejectAction={() => setPendingAction(null)}
        prefillPrompt={prefillPrompt}
        onConsumePrefill={() => setPrefillPrompt(null)}
      />
    </div>
  );
}

