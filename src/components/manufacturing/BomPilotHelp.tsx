"use client";
import * as React from "react";
import { InteractiveGuide } from "@/components/tutorial/InteractiveGuide";
import type { InteractiveGuideStep } from "@/lib/tutorial/interactive-types";
export type BomGuideStep = InteractiveGuideStep;
/** Preserve the approved BOM content while sharing the ERP guide UI. */
export function BomPilotHelp({ screen, steps }: { screen: "list" | "new" | "detail"; steps: BomGuideStep[] }) {
  return <InteractiveGuide guideId={screen} title={`BOM · ${screen === "new" ? "Create" : screen === "detail" ? "Record" : "Library"} guide`} steps={steps} startEvent
    launcherLabel={`Help with this BOM ${screen === "list" ? "list" : screen === "new" ? "form" : "record"}`} regionLabel="Interactive BOM guide" closeLabel="Close BOM guide" storagePrefix="erp-bom-guide:v1" />;
}
