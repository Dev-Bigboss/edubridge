import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(mocking: boolean) {
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", mocking ? "on" : "off");
  vi.resetModules();
  return (await import("./google")).googleSignInUrl;
}

describe("googleSignInUrl", () => {
  it("sends the browser to the backend's Google start with role and next", async () => {
    const url = new URL((await load(false))("INSTRUCTOR", "/teach/requests"));
    expect(url.pathname).toMatch(/\/auth\/google\/start$/);
    expect(url.searchParams.get("role")).toBe("INSTRUCTOR");
    expect(url.searchParams.get("next")).toBe("/teach/requests");
  });

  it("goes straight to the app callback when mocking", async () => {
    expect((await load(true))("LEARNER", null)).toBe("/auth/google/callback?role=LEARNER&mock=1");
  });
});
