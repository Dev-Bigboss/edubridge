import { API_BASE_URL } from "@/lib/api/client";

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";

/**
 * Google sign-in is a full-page redirect (ONB-1):
 *   app → GET {api}/auth/google/start?role&next → Google → backend callback (sets the session cookie)
 *   → {app}/auth/google/callback?next=… (or ?error=CODE)
 * With mocks on there is no backend to redirect through, so the callback page fakes the round trip.
 */
export function googleSignInUrl(role: "LEARNER" | "INSTRUCTOR", next: string | null) {
  const params = new URLSearchParams({ role });
  if (next) params.set("next", next);
  if (MOCKING) {
    params.set("mock", "1");
    return `/auth/google/callback?${params}`;
  }
  return `${API_BASE_URL}/auth/google/start?${params}`;
}
