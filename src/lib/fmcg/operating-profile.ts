"use client";

import * as React from "react";
import { fetchSalesDocumentFlowApi, isRouteDispatchMode, type SalesDocumentFlowSettings } from "@/lib/api/sales-document-flow";

/**
 * How this organisation runs its FMCG day, from Settings → Sales document flow.
 * Screens read these named choices; none of them depends on which customer the organisation is.
 */
export type OperatingProfile = {
  ready: boolean;
  routeDispatch: boolean;
  fullCatalogueOrderSheet: boolean;
  productionRecording: "planned" | "record_output";
  packSizeFromName: boolean;
  vanSalesBook: boolean;
};

const DEFAULT_PROFILE: OperatingProfile = {
  ready: false,
  routeDispatch: false,
  fullCatalogueOrderSheet: false,
  productionRecording: "planned",
  packSizeFromName: false,
  vanSalesBook: true,
};

export function operatingProfileFromFlow(flow: Partial<SalesDocumentFlowSettings> | null | undefined): OperatingProfile {
  if (!flow) return DEFAULT_PROFILE;
  return {
    ready: true,
    routeDispatch: isRouteDispatchMode(flow.mode),
    fullCatalogueOrderSheet: flow.prefillSalesOrderFinishedGoods === true,
    productionRecording: flow.productionRecording === "record_output" ? "record_output" : "planned",
    packSizeFromName: flow.finishedGoodsSalesUnit === "pack_size_in_name",
    vanSalesBook: flow.vanSalesBook !== false,
  };
}

let cached: { orgKey: string; at: number; value: OperatingProfile } | null = null;
let inflight: Promise<OperatingProfile> | null = null;
const TTL_MS = 30_000;

export function forgetCachedOperatingProfile(): void {
  cached = null;
  inflight = null;
}

async function loadProfile(orgKey: string): Promise<OperatingProfile> {
  if (cached && cached.orgKey === orgKey && Date.now() - cached.at < TTL_MS) return cached.value;
  if (!inflight) {
    inflight = fetchSalesDocumentFlowApi()
      .then((flow) => operatingProfileFromFlow(flow))
      .catch(() => ({ ...DEFAULT_PROFILE, ready: true }))
      .then((value) => {
        cached = { orgKey, at: Date.now(), value };
        inflight = null;
        return value;
      });
  }
  return inflight;
}

/** Pass the current org id so switching organisation refetches. */
export function useOperatingProfile(orgId: string | null | undefined): OperatingProfile {
  const orgKey = orgId ?? "";
  const [profile, setProfile] = React.useState<OperatingProfile>(
    cached && cached.orgKey === orgKey ? cached.value : DEFAULT_PROFILE
  );
  React.useEffect(() => {
    if (!orgKey) return;
    let current = true;
    void loadProfile(orgKey).then((value) => {
      if (current) setProfile(value);
    });
    return () => {
      current = false;
    };
  }, [orgKey]);
  return profile;
}
