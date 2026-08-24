import { afterEach, describe, expect, it } from "vitest";
import { odaflowApiCandidates, odaflowApiUrl } from "./odaflow-hub";

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
