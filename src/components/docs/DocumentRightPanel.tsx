"use client";

import * as React from "react";
import { RightPanel } from "@/components/layout/right-panel";
import { DocumentValidations } from "./DocumentValidations";
import { NextStepsPanel } from "./NextStepsPanel";

interface DocumentRightPanelProps {
  validations?: { ok: boolean; message: string }[];
  nextSteps?: string[];
  actions?: { label: string; href: string }[];
  children?: React.ReactNode;
}

/** Right panel for document view: validations, next steps, optional Copilot slot. */
export function DocumentRightPanel({
  validations,
  nextSteps = [],
  actions = [],
  children,
}: DocumentRightPanelProps) {
  return (
    <RightPanel title="Summary">
      {validations && <DocumentValidations items={validations} />}
      {(nextSteps.length > 0 || actions.length > 0) && <NextStepsPanel items={nextSteps} actions={actions} />}
      {children}
    </RightPanel>
  );
}
