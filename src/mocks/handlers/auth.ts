import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { API_BASE_URL } from "@/lib/api/client";
import { MOCK_MFA_CODE, MOCK_PASSWORD, mockSession, users } from "../db";

const url = (path: string) => `${API_BASE_URL}${path}`;

const unauthenticated = () =>
  HttpResponse.json({ code: "UNAUTHENTICATED", message: "Please sign in to continue." }, { status: 401 });

export const authHandlers = [
  http.get(url("/auth/me"), async () => {
    await delay(150);
    const user = users.find((u) => u.id === mockSession.get());
    return user ? HttpResponse.json({ user }) : unauthenticated();
  }),

  http.post(url("/auth/login"), async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { email?: string; password?: string };
    const user = users.find((u) => u.email.toLowerCase() === body.email?.trim().toLowerCase());

    if (!user || body.password !== MOCK_PASSWORD) {
      // Same message for unknown email and wrong password, so accounts can't be enumerated.
      return HttpResponse.json(
        { code: "INVALID_CREDENTIALS", message: "That email and password don't match an account." },
        { status: 401 },
      );
    }
    if (user.status === "SUSPENDED") {
      return HttpResponse.json(
        { code: "ACCOUNT_SUSPENDED", message: "This account is suspended. Contact support for help." },
        { status: 403 },
      );
    }
    if (user.mfa_enabled) {
      return HttpResponse.json({ mfa_required: true, mfa_challenge_id: mockSession.startMfa(user.id) });
    }
    mockSession.set(user.id);
    return HttpResponse.json({ mfa_required: false, user });
  }),

  http.post(url("/auth/mfa/verify"), async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { mfa_challenge_id?: string; code?: string };
    if (body.code !== MOCK_MFA_CODE) {
      return HttpResponse.json(
        {
          code: "INVALID_MFA_CODE",
          message: "That code didn't work.",
          field_errors: { code: ["That code is incorrect or has expired. Try the latest code."] },
        },
        { status: 400 },
      );
    }
    const userId = mockSession.finishMfa(body.mfa_challenge_id ?? "");
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return HttpResponse.json(
        { code: "MFA_CHALLENGE_EXPIRED", message: "Your sign-in timed out. Please sign in again." },
        { status: 400 },
      );
    }
    mockSession.set(user.id);
    return HttpResponse.json({ user });
  }),

  http.post(url("/auth/logout"), async () => {
    mockSession.set(null);
    return new HttpResponse(null, { status: 204 });
  }),
];
