import { afterEach, describe, expect, it } from "vitest";
import {
  odaflowApiCandidates,
  odaflowApiUrl,
  odaflowHubLoggedOutUrl,
  odaflowHubLoginUrl,
  odaflowHubResumeUrl,
} from "./odaflow-hub";

describe("odaflowApiCandidates", () => {
  const prevApi = process.env.NEXT_PUBLIC_ODAFLOW_API_URL;
  const prevSfa = process.env.NEXT_PUBLIC_SFA_API_URL;

  afterEach(() => {
    if (prevApi === undefined) delete process.env.NEXT_PUBLIC_ODAFLOW_API_URL;
    else process.env.NEXT_PUBLIC_ODAFLOW_API_URL = prevApi;
    if (prevSfa === undefined) delete process.env.NEXT_PUBLIC_SFA_API_URL;
    else process.env.NEXT_PUBLIC_SFA_API_URL = prevSfa;
  });

  it("includes api.odaflow.com on a production ERP host even when env points at dev", () => {
    process.env.NEXT_PUBLIC_ODAFLOW_API_URL = "https://dev.odaflow.com";
    const urls = odaflowApiCandidates("erp.odaflow.com");
    expect(urls).toContain("https://dev.odaflow.com");
    expect(urls).toContain("https://api.odaflow.com");
  });

  it("defaults production exchange to api.odaflow.com when env is unset", () => {
    delete process.env.NEXT_PUBLIC_ODAFLOW_API_URL;
    delete process.env.NEXT_PUBLIC_SFA_API_URL;
    expect(odaflowApiCandidates("erp.odaflow.com")[0]).toBe("https://api.odaflow.com");
    expect(odaflowApiUrl("erp.odaflow.com")).toBe("https://api.odaflow.com");
  });

  it("keeps local pages on the local hub first", () => {
    process.env.NEXT_PUBLIC_ODAFLOW_API_URL = "http://localhost:8080";
    const urls = odaflowApiCandidates("localhost");
    expect(urls[0]).toBe("http://localhost:8080");
    expect(urls).toContain("https://dev.odaflow.com");
    expect(urls).not.toContain("https://api.odaflow.com");
  });
});

describe("odaflow hub resume vs logout URLs", () => {
  it("resumes SSO without loggedOut", () => {
    const url = odaflowHubResumeUrl("erp");
    expect(url).toContain("/auth/sso?");
    expect(url).toContain("client=erp");
    expect(url).toContain("resume=1");
    expect(url).not.toContain("loggedOut=1");
  });

  it("sends the opened ERP page back through resume", () => {
    const url = odaflowHubResumeUrl("erp", "/docs/bill/new?poId=1");
    expect(url).toContain("next=%2Fdocs%2Fbill%2Fnew%3FpoId%3D1");
  });

  it("does not resume onto an external or auth path", () => {
    expect(odaflowHubResumeUrl("erp", "https://evil.example")).not.toContain("next=");
    expect(odaflowHubResumeUrl("erp", "//evil.example")).not.toContain("next=");
    expect(odaflowHubResumeUrl("erp", "/login")).not.toContain("next=");
    expect(odaflowHubResumeUrl("erp", "/auth/handoff")).not.toContain("next=");
  });

  it("sends an expired session to the SFA login form for the same page", () => {
    const url = odaflowHubLoginUrl("erp", "/docs/bill/new");
    expect(url).toContain("/login?");
    expect(url).toContain("client=erp");
    expect(url).toContain("session=expired");
    expect(url).toContain("next=%2Fdocs%2Fbill%2Fnew");
    expect(url).not.toContain("loggedOut=1");
    expect(url).not.toContain("/auth/sso");
  });

  it("keeps loggedOut only on the real sign-out URL", () => {
    const url = odaflowHubLoggedOutUrl("erp");
    expect(url).toContain("/login?");
    expect(url).toContain("loggedOut=1");
    expect(url).toContain("erpTried=1");
  });
});
