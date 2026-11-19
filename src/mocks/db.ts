import type { User } from "@/lib/api/schemas/auth";

/**
 * In-memory fixtures for the mock API. Realistic but obviously fake (example.com, test names)
 * so nothing here can be mistaken for real data in a demo.
 */

export const MOCK_PASSWORD = "Password123!";
export const MOCK_MFA_CODE = "123456";

export const users: User[] = [
  {
    id: "usr_learner_1",
    role: "LEARNER",
    email: "learner@example.com",
    name: "Test Learner",
    timezone: "Africa/Lagos",
    status: "ACTIVE",
    avatar_url: null,
    onboarding_status: "COMPLETED",
    approval_status: null,
    mfa_enabled: false,
  },
  {
    id: "usr_instructor_1",
    role: "INSTRUCTOR",
    email: "instructor@example.com",
    name: "Test Instructor",
    timezone: "Europe/London",
    status: "ACTIVE",
    avatar_url: null,
    onboarding_status: "COMPLETED",
    approval_status: "APPROVED",
    mfa_enabled: true,
  },
  {
    id: "usr_admin_1",
    role: "ADMIN",
    email: "admin@example.com",
    name: "Test Admin",
    timezone: "Africa/Lagos",
    status: "ACTIVE",
    avatar_url: null,
    onboarding_status: "COMPLETED",
    approval_status: null,
    mfa_enabled: true,
  },
];

/**
 * The real backend keeps the session in an httpOnly cookie. The mock can't, so it remembers the
 * signed-in user id in memory and, in the browser, in localStorage so a page refresh keeps you in.
 */
const SESSION_KEY = "edubridge.mock.session";
let memorySession: string | null = null;
const pendingMfa = new Map<string, string>();

export const mockSession = {
  get(): string | null {
    if (memorySession) return memorySession;
    try {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  set(userId: string | null) {
    memorySession = userId;
    try {
      if (typeof localStorage === "undefined") return;
      if (userId) localStorage.setItem(SESSION_KEY, userId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage blocked: memory session still works for this tab */
    }
  },
  startMfa(userId: string): string {
    const id = `mfa_${Math.random().toString(36).slice(2)}`;
    pendingMfa.set(id, userId);
    return id;
  },
  finishMfa(challengeId: string): string | null {
    const userId = pendingMfa.get(challengeId) ?? null;
    pendingMfa.delete(challengeId);
    return userId;
  },
  reset() {
    memorySession = null;
    pendingMfa.clear();
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  },
};
