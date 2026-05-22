"use client";

import { AppSidebar } from "@/components/nav/AppSidebar";
import { Header } from "./header";
import { CommandPalette } from "@/components/command/CommandPalette";
import { FirstVisitBanner } from "@/components/tutorial/FirstVisitBanner";
import { TutorialProgressTracker } from "@/components/tutorial/TutorialProgressTracker";
import { useUIStore } from "@/stores/ui-store";
import { useCopilotStore } from "@/stores/copilot-store";
import { useAuthStore } from "@/stores/auth-store";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { automationInsightApply } from "@/lib/api/stub-endpoints";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setRightPanelOpen, setCompactMode } = useUIStore();

  // Apply persisted UI preferences after hydration to avoid SSR mismatch.
  // The store initializes with safe SSR defaults; this runs only on the client.
  useEffect(() => {
    const panel = localStorage.getItem("odaflow_right_panel");
    if (panel !== null) setRightPanelOpen(panel === "true");
    const compact = localStorage.getItem("odaflow_compact_mode");
    if (compact !== null) setCompactMode(compact === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const copilotEnabled = useCopilotFeatureEnabled();
  const {
    drawerOpen,
    setDrawerOpen,
    pendingAction,
    setPendingAction,
    prefillPrompt,
    setPrefillPrompt,
  } = useCopilotStore();
  const { currentBranch } = useAuthStore();

  useEffect(() => {
    if (!copilotEnabled) setDrawerOpen(false);
  }, [copilotEnabled, setDrawerOpen]);

  const handleApplyAction = () => {
    if (!pendingAction) {
      setPendingAction(null);
      return;
    }
    const insightId = pendingAction.id;
    const actionId =
      "payload" in pendingAction &&
      pendingAction.payload &&
      "recommendationKey" in pendingAction.payload
        ? ((pendingAction.payload as { recommendationKey?: string })
            .recommendationKey ?? insightId)
        : insightId;
    if (isApiConfigured()) {
      automationInsightApply(insightId, actionId)
        .then(() => {
          toast.success("Action applied.");
          setPendingAction(null);
        })
        .catch((e) => toast.error((e as Error).message));
      return;
    }
    toast.info("Action apply requires a live API. Set NEXT_PUBLIC_API_URL.");
    setPendingAction(null);
  };

  const contextPills = [
    ...(currentBranch ? [{ label: "Branch", value: currentBranch.name }] : []),
    { label: "Period", value: "Jan 2025" },
  ];

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {sidebarOpen && <AppSidebar />}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* shrink-0: banner height never affects the scrollport below */}
          <div className="shrink-0">
            <TutorialProgressTracker />
            <FirstVisitBanner />
          </div>
          {/* flex-1 min-h-0: page fills viewport; tables scroll inside, not the whole shell */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="box-border flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden px-6 pb-6 pt-0">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
            </div>
          </div>
        </main>
      </div>
      <CommandPalette />
      {copilotEnabled ? (
        <CopilotDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          contextPills={contextPills}
          pendingAction={pendingAction}
          onApplyAction={handleApplyAction}
          onRejectAction={() => setPendingAction(null)}
          prefillPrompt={prefillPrompt}
          onConsumePrefill={() => setPrefillPrompt(null)}
        />
      ) : null}
    </div>
  );
}
