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
  routeCollectionsEnabled: boolean;
  /** Store route trucks load from, when saved in Sales document flow. */
  dispatchWarehouseId?: string;
  fullCatalogueOrderSheet: boolean;
  lineItemLayout: SalesLineItemLayout;
  /** Fixed order sheet: every active finished good, no search or browse. */
  fixedOrderSheet: boolean;
  productionRecording: "planned" | "record_output";
  packSizeFromName: boolean;
  vanSalesBook: boolean;
};

const DEFAULT_PROFILE: OperatingProfile = {
  ready: false,
  routeDispatch: false,
  routeCollectionsEnabled: false,
  fullCatalogueOrderSheet: false,
  lineItemLayout: "picker",
  fixedOrderSheet: false,
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
    routeCollectionsEnabled: flow.routeCollectionsEnabled === true,
    dispatchWarehouseId: flow.dispatchWarehouseId?.trim() || undefined,
    fullCatalogueOrderSheet: lineItemLayout === "catalogue",
    lineItemLayout,
    fixedOrderSheet: lineItemLayout === "catalogue" && flow.fixedOrderSheet === true,
    productionRecording: flow.productionRecording === "record_output" ? "record_output" : "planned",
    packSizeFromName: flow.finishedGoodsSalesUnit === "pack_size_in_name",
    vanSalesBook: flow.vanSalesBook !== false,
  };
}

const cached = new Map<string, { at: number; value: OperatingProfile }>();
const inflight = new Map<string, Promise<OperatingProfile>>();
const TTL_MS = 30_000;

export function forgetCachedOperatingProfile(): void {
  cached.clear();
  inflight.clear();
}

function loadProfile(orgKey: string): Promise<OperatingProfile> {
  const hit = cached.get(orgKey);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  const pending = inflight.get(orgKey);
  if (pending) return pending;

  const request = fetchSalesDocumentFlowApi()
    .then(operatingProfileFromFlow)
    .catch(() => ({ ...DEFAULT_PROFILE, ready: true }))
    .then((value) => {
      if (inflight.get(orgKey) === request) {
        cached.set(orgKey, { at: Date.now(), value });
        inflight.delete(orgKey);
      }
      return value;
    });
  inflight.set(orgKey, request);
  return request;
}

/** Pass the current org id so switching organisation refetches. */
export function useOperatingProfile(orgId: string | null | undefined): OperatingProfile {
  const orgKey = orgId ?? "";
  const [profile, setProfile] = React.useState(() => ({ orgKey, value: cached.get(orgKey)?.value ?? DEFAULT_PROFILE }));
  React.useEffect(() => {
    if (!orgKey) return;
    let current = true;
    void loadProfile(orgKey).then((value) => {
      if (current) setProfile({ orgKey, value });
    });
    return () => { current = false; };
  }, [orgKey]);
  return profile.orgKey === orgKey ? profile.value : cached.get(orgKey)?.value ?? DEFAULT_PROFILE;
}
