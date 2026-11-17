"use client";

import * as React from "react";
import { fetchSalesDocumentFlowApi, isRouteDispatchMode, resolveSalesLineItemLayout, type SalesDocumentFlowSettings, type SalesLineItemLayout } from "@/lib/api/sales-document-flow";

/**
 * How this organisation runs its FMCG day, from Settings → Sales document flow.
 * Screens read these named choices; none of them depends on which customer the organisation is.
 */
export type OperatingProfile = {
  ready: boolean;
  routeDispatch: boolean;
  fullCatalogueOrderSheet: boolean;
  lineItemLayout: SalesLineItemLayout;
  productionRecording: "planned" | "record_output";
  packSizeFromName: boolean;
  vanSalesBook: boolean;
};

const DEFAULT_PROFILE: OperatingProfile = {
  ready: false,
  routeDispatch: false,
  fullCatalogueOrderSheet: false,
  lineItemLayout: "picker",
  productionRecording: "planned",
  packSizeFromName: false,
  vanSalesBook: true,
};

export function operatingProfileFromFlow(flow: Partial<SalesDocumentFlowSettings> | null | undefined): OperatingProfile {
  if (!flow) return DEFAULT_PROFILE;
  const lineItemLayout = resolveSalesLineItemLayout(flow);
  return {
    ready: true,
    routeDispatch: isRouteDispatchMode(flow.mode),
    fullCatalogueOrderSheet: lineItemLayout === "catalogue",
    lineItemLayout,
    productionRecording: flow.productionRecording === "record_output" ? "record_output" : "planned",
    packSizeFromName: flow.finishedGoodsSalesUnit === "pack_size_in_name",
    vanSalesBook: flow.vanSalesBook !== false,
  };
}

const profiles = new Map<string, { value: Promise<OperatingProfile>; expiresAt: number }>();
const TTL_MS = 30_000;

export function forgetCachedOperatingProfile(): void {
  profiles.clear();
}

async function loadProfile(orgKey: string): Promise<OperatingProfile> {
  const cached = profiles.get(orgKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const value = fetchSalesDocumentFlowApi()
    .then(operatingProfileFromFlow)
    .catch(() => ({ ...DEFAULT_PROFILE, ready: true }));
  profiles.set(orgKey, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

/** Pass the current org id so switching organisation refetches. */
export function useOperatingProfile(orgId: string | null | undefined): OperatingProfile {
  const orgKey = orgId ?? "";
  const [loaded, setLoaded] = React.useState<{ orgKey: string; profile: OperatingProfile }>();
  React.useEffect(() => {
    if (!orgKey) return;
    let current = true;
    void loadProfile(orgKey).then((value) => {
      if (current) setLoaded({ orgKey, profile: value });
    });
    return () => {
      current = false;
    };
  }, [orgKey]);
  return loaded?.orgKey === orgKey ? loaded.profile : DEFAULT_PROFILE;
}
