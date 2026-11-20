import { describe, expect, it } from "vitest";
import { compareStoresForBatch, recommendOutputStore } from "./store-list-order";

const route = { id: "c4", code: "C4", name: "C4 FRIDAY" };
const production = { id: "prd", code: "PRD", name: "PRODUCTION WARE HOUSE", purpose: "STORAGE" };
const dispatch = { id: "dsp", code: "DSP", name: "Dispatch", purpose: "DISPATCH" };
const receiving = { id: "rcv", code: "RCV", name: "Receiving bay", purpose: "RECEIVING" };
const label = (store: { code?: string | null; name?: string | null }) => [store.code, store.name].filter(Boolean).join(" ");

describe("batch store list order", () => {
  it("keeps the recommended store first, then shelf stores, then route stores", () => {
    const ordered = [dispatch, route, production, receiving].sort((a, b) => compareStoresForBatch(a, b, route.id, label));
    expect(ordered.map((store) => store.id)).toEqual(["c4", "dsp", "prd", "rcv"]);
  });

  it("puts shelf stores ahead of a route store when nothing is recommended", () => {
    const ordered = [route, dispatch, production].sort((a, b) => compareStoresForBatch(a, b, undefined, label));
    expect(ordered.map((store) => store.id)).toEqual(["dsp", "prd", "c4"]);
  });

  it("recommends the production warehouse ahead of other shelf stores and route stores", () => {
    expect(recommendOutputStore([route, dispatch, receiving, production])?.id).toBe("prd");
  });

  it("keeps a formula shelf store as the output recommendation", () => {
    expect(recommendOutputStore([route, production, dispatch], "dsp")?.id).toBe("dsp");
  });

  it("does not recommend a route store named on the formula", () => {
    expect(recommendOutputStore([route, dispatch, production], route.id)?.id).toBe("prd");
  });
});
