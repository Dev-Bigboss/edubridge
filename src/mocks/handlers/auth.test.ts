import { beforeEach, describe, expect, it } from "vitest";
import { api, ApiError } from "@/lib/api/client";
import { LoginResponse, RegisterResponse, SessionResponse } from "@/lib/api/schemas/auth";
import { LEGAL_VERSIONS, db, mockSession } from "../db";

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

  const registration = (over: Record<string, unknown> = {}) => ({
    role: "LEARNER",
    name: "New Person",
    email: "new.person@example.com",
    password: "a long passphrase",
    timezone: "Europe/Berlin",
    accept_terms: true,
    terms_version: LEGAL_VERSIONS.terms,
    privacy_version: LEGAL_VERSIONS.privacy,
    ...over,
  });
  const linkToken = (path: string) => new URL(db.outbox.find((m) => m.link.includes(path))!.link).searchParams.get("token")!;

  it("registers, blocks sign-in until verified, then verifies and signs in", async () => {
    const res = await api("/auth/register", { method: "POST", body: registration(), schema: RegisterResponse });
    expect(res.email).toBe("new.person@example.com");

    const blocked = await failure(api("/auth/login", { method: "POST", body: { email: res.email, password: "a long passphrase" } }));
    expect(blocked.code).toBe("EMAIL_NOT_VERIFIED");

    const token = linkToken("/verify-email");
    const verified = await api("/auth/email/verify", { method: "POST", body: { token }, schema: SessionResponse });
    expect(verified.user).toMatchObject({ status: "ACTIVE", onboarding_status: "NOT_STARTED", timezone: "Europe/Berlin" });

    // Single use.
    const again = await failure(api("/auth/email/verify", { method: "POST", body: { token } }));
    expect(again.code).toBe("TOKEN_INVALID");
  });

  it("does not reveal that an email is already registered", async () => {
    const res = await api("/auth/register", {
      method: "POST",
      body: registration({ email: "learner@example.com" }),
      schema: RegisterResponse,
    });
    expect(res.email).toBe("learner@example.com");
  });

  it("rejects registration without consent or with stale document versions", async () => {
    const noConsent = await failure(api("/auth/register", { method: "POST", body: registration({ accept_terms: false }) }));
    expect(noConsent.fieldErrors.accept_terms).toBeDefined();
    const stale = await failure(api("/auth/register", { method: "POST", body: registration({ terms_version: "2020-01-01" }) }));
    expect(stale.code).toBe("LEGAL_VERSION_OUTDATED");
  });

  it("resets a password with the emailed link", async () => {
    await api("/auth/password/forgot", { method: "POST", body: { email: "learner@example.com" } });
    const token = linkToken("/reset-password");
    await api("/auth/password/reset", { method: "POST", body: { token, password: "brand new passphrase" } });
    const res = await api("/auth/login", {
      method: "POST",
      body: { email: "learner@example.com", password: "brand new passphrase" },
      schema: LoginResponse,
    });
    expect(res.mfa_required).toBe(false);
  });

  it("answers forgot-password the same way for unknown emails", async () => {
    await expect(api("/auth/password/forgot", { method: "POST", body: { email: "nobody@example.com" } })).resolves.toBeUndefined();
    expect(db.outbox).toHaveLength(0);
  });

  it("records consent for a Google sign-up", async () => {
    const g = await api("/__mock/google", { method: "POST", body: { role: "LEARNER" }, schema: SessionResponse });
    expect(g.user.consent_required).toBe(true);
    const res = await api("/auth/consent", {
      method: "POST",
      body: { terms_version: LEGAL_VERSIONS.terms, privacy_version: LEGAL_VERSIONS.privacy },
      schema: SessionResponse,
    });
    expect(res.user.consent_required).toBe(false);
  });
});
