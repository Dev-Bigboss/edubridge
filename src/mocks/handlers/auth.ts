import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { API_BASE_URL } from "@/lib/api/client";
import type { RegisterRequest } from "@/lib/api/schemas/auth";
import {
  LEGAL_VERSIONS,
  MOCK_MFA_CODE,
  db,
  findUser,
  findUserByEmail,
  issueToken,
  mockSession,
  newId,
  redeemToken,
  save,
  sendMail,
  toUser,
  type MockUser,
} from "../db";

const url = (path: string) => `${API_BASE_URL}${path}`;
const APP = typeof location === "undefined" ? "http://localhost:3000" : location.origin;

const error = (status: number, code: string, message: string, field_errors?: Record<string, string[]>) =>
  HttpResponse.json({ code, message, ...(field_errors && { field_errors }) }, { status });

const unauthenticated = () => error(401, "UNAUTHENTICATED", "Please sign in to continue.");

const currentUser = () => findUser(mockSession.get());

function sendVerification(user: MockUser) {
  const token = issueToken("VERIFY_EMAIL", user.id);
  sendMail(user.email, "Confirm your email address", `${APP}/verify-email?token=${token}`);
}

/** Only one resend per 30 s per address, like the backend's rate limit (NFR Security). */
const lastResend = new Map<string, number>();
function rateLimited(email: string) {
  const now = Date.now();
  const last = lastResend.get(email) ?? 0;
  if (now - last < 30_000) return true;
  lastResend.set(email, now);
  return false;
}

/** Accepted versions must match the current documents (ONB-4). */
const versionsCurrent = (b: { terms_version?: string; privacy_version?: string }) =>
  b.terms_version === LEGAL_VERSIONS.terms && b.privacy_version === LEGAL_VERSIONS.privacy;

const outdatedVersions = () =>
  error(409, "LEGAL_VERSION_OUTDATED", "Our terms were updated while you were on this page. Please review them again.");

export const authHandlers = [
  http.get(url("/auth/me"), async () => {
    await delay(150);
    const user = currentUser();
    return user ? HttpResponse.json({ user: toUser(user) }) : unauthenticated();
  }),

  http.post(url("/auth/login"), async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { email?: string; password?: string };
    const user = findUserByEmail(body.email);

    if (!user || !user.password || body.password !== user.password) {
      // Same message for unknown email and wrong password, so accounts can't be enumerated.
      return error(401, "INVALID_CREDENTIALS", "That email and password don't match an account.");
    }
    if (user.status === "SUSPENDED") {
      return error(403, "ACCOUNT_SUSPENDED", "This account is suspended. Contact support for help.");
    }
    if (user.status === "PENDING_VERIFICATION") {
      return error(403, "EMAIL_NOT_VERIFIED", "Confirm your email address first. We can send the link again.");
    }
    if (user.mfa_enabled) {
      return HttpResponse.json({ mfa_required: true, mfa_challenge_id: mockSession.startMfa(user.id) });
    }
    mockSession.set(user.id);
    return HttpResponse.json({ mfa_required: false, user: toUser(user) });
  }),

  http.post(url("/auth/mfa/verify"), async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { mfa_challenge_id?: string; code?: string };
    if (body.code !== MOCK_MFA_CODE) {
      return error(400, "INVALID_MFA_CODE", "That code didn't work.", {
        code: ["That code is incorrect or has expired. Try the latest code."],
      });
    }
    const user = findUser(mockSession.finishMfa(body.mfa_challenge_id ?? ""));
    if (!user) return error(400, "MFA_CHALLENGE_EXPIRED", "Your sign-in timed out. Please sign in again.");
    mockSession.set(user.id);
    return HttpResponse.json({ user: toUser(user) });
  }),

  http.post(url("/auth/logout"), async () => {
    mockSession.set(null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url("/auth/register"), async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as Partial<RegisterRequest>;
    if (body.role !== "LEARNER" && body.role !== "INSTRUCTOR") {
      return error(422, "VALIDATION_FAILED", "Choose whether you want to learn or teach.");
    }
    if (!body.accept_terms) {
      return error(422, "VALIDATION_FAILED", "Check the form.", {
        accept_terms: ["Please accept the terms and privacy policy to continue."],
      });
    }
    if (!versionsCurrent(body)) return outdatedVersions();
    if ((body.password ?? "").length < 10) {
      return error(422, "VALIDATION_FAILED", "Check the form.", { password: ["Use at least 10 characters."] });
    }
    const existing = findUserByEmail(body.email);
    if (existing) {
      // Don't reveal that the address is registered: behave as if it worked and email the owner instead.
      sendMail(existing.email, "Someone tried to create an account with your email", `${APP}/login`);
      return HttpResponse.json({ email: existing.email }, { status: 202 });
    }
    const user: MockUser = {
      id: newId("usr"),
      role: body.role,
      email: body.email!.trim().toLowerCase(),
      name: body.name!.trim(),
      timezone: body.timezone || "UTC",
      status: "PENDING_VERIFICATION",
      avatar_url: null,
      onboarding_status: "NOT_STARTED",
      approval_status: body.role === "INSTRUCTOR" ? "PENDING" : null,
      // NFR Security: instructors enrol an authenticator during onboarding. The mock treats it as done.
      mfa_enabled: body.role === "INSTRUCTOR",
      consent_required: false,
      password: body.password!,
    };
    db.users.push(user);
    save();
    sendVerification(user);
    return HttpResponse.json({ email: user.email }, { status: 202 });
  }),

  http.post(url("/auth/email/verify"), async ({ request }) => {
    await delay(400);
    const { token } = (await request.json()) as { token?: string };
    const user = findUser(redeemToken("VERIFY_EMAIL", token));
    if (!user) {
      return error(400, "TOKEN_INVALID", "This link has expired or was already used. We can send you a new one.");
    }
    user.status = "ACTIVE";
    save();
    // Signs the person in so they go straight to onboarding. MFA users still need their code next time.
    mockSession.set(user.id);
    return HttpResponse.json({ user: toUser(user) });
  }),

  http.post(url("/auth/email/resend"), async ({ request }) => {
    await delay(300);
    const { email } = (await request.json()) as { email?: string };
    if (email && rateLimited(email.toLowerCase())) {
      return error(429, "RATE_LIMITED", "We just sent a link. Wait 30 seconds before asking for another.");
    }
    const user = findUserByEmail(email);
    if (user?.status === "PENDING_VERIFICATION") sendVerification(user);
    // Always 202 so the response doesn't reveal whether the address has an account.
    return new HttpResponse(null, { status: 202 });
  }),

  http.post(url("/auth/password/forgot"), async ({ request }) => {
    await delay(400);
    const { email } = (await request.json()) as { email?: string };
    const user = findUserByEmail(email);
    if (user && user.status !== "SUSPENDED") {
      const token = issueToken("RESET_PASSWORD", user.id);
      sendMail(user.email, "Reset your password", `${APP}/reset-password?token=${token}`);
    }
    return new HttpResponse(null, { status: 202 });
  }),

  http.post(url("/auth/password/reset"), async ({ request }) => {
    await delay(400);
    const { token, password } = (await request.json()) as { token?: string; password?: string };
    if ((password ?? "").length < 10) {
      return error(422, "VALIDATION_FAILED", "Check the form.", { password: ["Use at least 10 characters."] });
    }
    const user = findUser(redeemToken("RESET_PASSWORD", token));
    if (!user) {
      return error(400, "TOKEN_INVALID", "This reset link has expired or was already used. Request a new one.");
    }
    user.password = password!;
    // A reset proves control of the inbox, so it also verifies the address.
    if (user.status === "PENDING_VERIFICATION") user.status = "ACTIVE";
    save();
    // NFR Security: a reset signs out every existing session.
    if (mockSession.get() === user.id) mockSession.set(null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url("/auth/consent"), async ({ request }) => {
    await delay(300);
    const user = currentUser();
    if (!user) return unauthenticated();
    const body = (await request.json()) as { terms_version?: string; privacy_version?: string };
    if (!versionsCurrent(body)) return outdatedVersions();
    user.consent_required = false;
    save();
    return HttpResponse.json({ user: toUser(user) });
  }),

  /**
   * Mock-only stand-in for the Google redirect round trip (GET /auth/google/start → Google →
   * backend callback → app). Signs in, or creates, a Google learner who still owes consent.
   */
  http.post(url("/__mock/google"), async ({ request }) => {
    await delay(500);
    const { role } = (await request.json()) as { role?: "LEARNER" | "INSTRUCTOR" };
    const email = role === "INSTRUCTOR" ? "google.instructor@example.com" : "google.learner@example.com";
    let user = findUserByEmail(email);
    if (!user) {
      user = {
        id: newId("usr"),
        role: role === "INSTRUCTOR" ? "INSTRUCTOR" : "LEARNER",
        email,
        name: role === "INSTRUCTOR" ? "Google Instructor" : "Google Learner",
        timezone: "UTC",
        status: "ACTIVE",
        avatar_url: null,
        onboarding_status: "NOT_STARTED",
        approval_status: role === "INSTRUCTOR" ? "PENDING" : null,
        mfa_enabled: false,
        consent_required: true,
        password: null,
      };
      db.users.push(user);
      save();
    }
    mockSession.set(user.id);
    return HttpResponse.json({ user: toUser(user) });
  }),

  /** Mock-only: the "emails" the backend would have sent, for the dev inbox note. */
  http.get(url("/__mock/outbox"), ({ request }) => {
    const to = new URL(request.url).searchParams.get("to")?.toLowerCase();
    return HttpResponse.json({ emails: db.outbox.filter((m) => !to || m.to === to) });
  }),
];
