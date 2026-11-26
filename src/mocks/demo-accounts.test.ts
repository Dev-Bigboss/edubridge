import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { LoginResponse, SessionResponse } from "@/lib/api/schemas/auth";
import { MOCK_MFA_CODE, MOCK_PASSWORD, db, resetDb } from "./db";
import { DEMO_ACCOUNTS, DEMO_MFA_CODE, DEMO_PASSWORD } from "./demo-accounts";

describe("demo accounts listed on the login page", () => {
  beforeEach(() => resetDb());

  it("use the mock store's password and two-step code", () => {
    expect(DEMO_PASSWORD).toBe(MOCK_PASSWORD);
    expect(DEMO_MFA_CODE).toBe(MOCK_MFA_CODE);
  });

  it("each exists in the seed with the role shown", () => {
    for (const a of DEMO_ACCOUNTS) {
      expect(db.users.find((u) => u.email === a.email)?.role, a.email).toBe(a.role);
    }
  });

  it.each(DEMO_ACCOUNTS.filter((a) => a.email !== "suspended@example.com"))("$email can sign in", async (a) => {
    const res = await api("/auth/login", { method: "POST", body: { email: a.email, password: DEMO_PASSWORD }, schema: LoginResponse });
    const user = res.mfa_required
      ? (await api("/auth/mfa/verify", { method: "POST", body: { mfa_challenge_id: res.mfa_challenge_id, code: DEMO_MFA_CODE }, schema: SessionResponse })).user
      : res.user;
    expect(user.email).toBe(a.email);
  });

  it("the suspended account is refused", async () => {
    const err = await api("/auth/login", { method: "POST", body: { email: "suspended@example.com", password: DEMO_PASSWORD } }).catch((e) => e as ApiError);
    expect(err).toMatchObject({ status: 403, code: "ACCOUNT_SUSPENDED" });
  });
});
