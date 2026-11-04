import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/firebase", () => ({ getCurrentFirebaseIdTokenForApi: vi.fn(async () => "test-erp-session") }));
vi.mock("@/lib/runtime-flags", () => ({ canUseDevHeaders: () => false }));
import { clearGaiaSessionCache, sendGaiaMessage } from "./gaia-service";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
const authBefore = useAuthStore.getState();
const contextBefore = useOrgContextStore.getState();
beforeEach(() => {
  clearGaiaSessionCache();
  useAuthStore.setState({ permissions: ["*"], isPlatformOperator: false });
  useOrgContextStore.getState().hydrateFromBackend({ templateId: "bakex", orgType: "MANUFACTURER" });
});
afterEach(() => { vi.unstubAllGlobals(); useAuthStore.setState(authBefore, true); useOrgContextStore.setState(contextBefore, true); clearGaiaSessionCache(); });
describe("Gaia handbook grounding", () => {
  it("sends the selected guide as documentation and returns clickable related links", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-gaia-session", expires_in_minutes: 10 }))).mockResolvedValueOnce(new Response(JSON.stringify({ reply: "Select the customer, then the statement dates.", citations: [{ source: "ERP handbook", cutoff: "2026-11-03" }] })));
    vi.stubGlobal("fetch", fetch);
    const reply = await sendGaiaMessage("Explain customer statements", { tutorialGuide: "/tutorial/finance/ar-statements" });
    expect(fetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.message).toContain("ERP handbook reference");
    expect(body.message).toContain("/tutorial/finance/ar-statements");
    expect(body.message).toContain("not evidence");
    expect(reply).toContain("Select the customer"); expect(reply).toContain("[Customer statements](/tutorial/finance/ar-statements)");
    expect(fetch.mock.calls.every(([, options]) => options.method === "POST")).toBe(true);
  });
  it("falls back to explicit saved instructions when Gaia cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const reply = await sendGaiaMessage("Explain production", { tutorialGuide: "/tutorial/processing/manufacturing-production-plan" });
    expect(reply).toContain("AI service is unavailable"); expect(reply).toContain("Work backwards"); expect(reply).toContain("QC hold");
  });
  it("does not transmit or answer a requested guide outside the user's scope", async () => {
    useAuthStore.setState({ permissions: ["sales.read"] });
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const reply = await sendGaiaMessage("Explain users", { tutorialGuide: "/tutorial/settings/settings-users-roles" });
    expect(reply).toContain("not available"); expect(fetch).not.toHaveBeenCalled();
  });
});
