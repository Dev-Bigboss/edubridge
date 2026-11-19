import { beforeEach, describe, expect, it } from "vitest";
import { api, ApiError } from "@/lib/api/client";
import { LoginResponse, SessionResponse } from "@/lib/api/schemas/auth";
import { mockSession } from "../db";

/** Awaits a call that must fail and returns its ApiError. */
const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

/** Keeps the mock honest: it must satisfy the same schemas the app parses with. */
describe("auth mock follows contracts/openapi/auth.yaml", () => {
  beforeEach(() => mockSession.reset());

  it("learner signs in without MFA", async () => {
    const res = await api("/auth/login", {
      method: "POST",
      body: { email: "Learner@Example.com ", password: "Password123!" },
      schema: LoginResponse,
    });
    expect(res.mfa_required).toBe(false);
    const me = await api("/auth/me", { schema: SessionResponse });
    expect(me.user.role).toBe("LEARNER");
  });

  it("admin needs MFA before a session exists", async () => {
    const res = await api("/auth/login", {
      method: "POST",
      body: { email: "admin@example.com", password: "Password123!" },
      schema: LoginResponse,
    });
    expect(res.mfa_required).toBe(true);
    await expect(api("/auth/me")).rejects.toMatchObject({ status: 401 });

    if (!res.mfa_required) throw new Error("expected MFA");
    const bad = await failure(api("/auth/mfa/verify", {
      method: "POST",
      body: { mfa_challenge_id: res.mfa_challenge_id, code: "000000" },
    }));
    expect(bad.fieldErrors.code).toBeDefined();

    const ok = await api("/auth/mfa/verify", {
      method: "POST",
      body: { mfa_challenge_id: res.mfa_challenge_id, code: "123456" },
      schema: SessionResponse,
    });
    expect(ok.user.role).toBe("ADMIN");
  });

  it("same error for unknown email and wrong password", async () => {
    const a = await failure(api("/auth/login", { method: "POST", body: { email: "nobody@example.com", password: "x" } }));
    const b = await failure(api("/auth/login", { method: "POST", body: { email: "learner@example.com", password: "x" } }));
    expect(a.code).toBe("INVALID_CREDENTIALS");
    expect(b.code).toBe(a.code);
    expect(b.message).toBe(a.message);
  });

  it("logout ends the session", async () => {
    await api("/auth/login", { method: "POST", body: { email: "learner@example.com", password: "Password123!" } });
    await api("/auth/logout", { method: "POST" });
    await expect(api("/auth/me")).rejects.toMatchObject({ status: 401 });
  });
});
