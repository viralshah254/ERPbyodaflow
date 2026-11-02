import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ local: vi.fn(), configured: vi.fn(), session: vi.fn(), finish: vi.fn(), set: vi.fn(), logout: vi.fn(), hydrate: vi.fn(), template: vi.fn() }));
vi.mock("@/lib/runtime-flags", () => ({ canUseDevHeaders: mocks.local }));
vi.mock("@/lib/firebase", () => ({ getFirebaseConfig: vi.fn(), isFirebaseConfigured: () => false, isRememberMeExpired: () => false, signOut: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: mocks.configured, erpHandoffGraceActive: () => false, setApiAuth: vi.fn() }));
vi.mock("@/lib/api/context", () => ({ fetchRuntimeSession: mocks.session }));
vi.mock("@/lib/auth/restore-erp-session", () => ({ restoreErpSessionFromHub: vi.fn() }));
vi.mock("@/lib/auth/odaflow-hub", () => ({ odaflowHubLoggedOutUrl: vi.fn(), odaflowHubLoginUrl: vi.fn() }));
vi.mock("@/lib/auth/sso-logout-sync", () => ({ onOdaflowLogout: vi.fn(), shouldDropLocalSession: () => false }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ finishHydration: mocks.finish, setSession: mocks.set, logout: mocks.logout }) }));
vi.mock("@/stores/orgContextStore", () => ({ useOrgContextStore: Object.assign((selector: (state: unknown) => unknown) => selector({ applyTemplate: mocks.template }), { getState: () => ({ hydrateFromBackend: mocks.hydrate }) }) }));
import { AuthRestore } from "./auth-restore";
describe("explicit local developer session restoration", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.local.mockReturnValue(true); mocks.configured.mockReturnValue(true); });
  afterEach(cleanup);
  it("restores the backend-authorized local account without Firebase", async () => {
    const session = { user: { id: "qa" }, org: { orgType: "MANUFACTURER" }, orgContext: { templateId: "qa" } };
    mocks.session.mockResolvedValue(session); render(<AuthRestore />);
    await waitFor(() => expect(mocks.set).toHaveBeenCalledWith(session));
    expect(mocks.hydrate).toHaveBeenCalledWith({ templateId: "qa", orgType: "MANUFACTURER" });
  });
  it("does not use developer headers outside the explicit local mode", async () => {
    mocks.local.mockReturnValue(false); render(<AuthRestore />);
    await waitFor(() => expect(mocks.finish).toHaveBeenCalled());
    expect(mocks.session).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
  });
  it("clears the local session on backend rejection", async () => {
    mocks.session.mockRejectedValue(new Error("Unauthorized")); render(<AuthRestore />);
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled()); expect(mocks.set).not.toHaveBeenCalled();
  });
});
