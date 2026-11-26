import type { Role } from "@/lib/domain/enums";

/** Where each role lands after sign-in (plan §4 route map). */
export const ROLE_HOME: Record<Role, string> = {
  LEARNER: "/learn",
  INSTRUCTOR: "/teach",
  ADMIN: "/admin",
};

/**
 * Only follow `?next=` to an internal path, so a crafted link can't bounce a fresh sign-in
 * to another site (open redirect, OWASP).
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** The role a path belongs to, or null for public paths. */
export function roleForPath(pathname: string): Role | null {
  if (pathname === "/learn" || pathname.startsWith("/learn/")) return "LEARNER";
  if (pathname === "/teach" || pathname.startsWith("/teach/")) return "INSTRUCTOR";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "ADMIN";
  return null;
}

/** After sign-in: go to `next` if it belongs to this role (or is public), else the role's home. */
export function postLoginPath(role: Role, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (safe) {
    const owner = roleForPath(new URL(safe, "http://x").pathname);
    if (owner === null || owner === role) return safe;
  }
  return ROLE_HOME[role];
}

/** ONB-2/3 wizards. Admins have no onboarding. */
export const ONBOARDING_PATH: Partial<Record<Role, string>> = {
  LEARNER: "/onboarding/learner",
  INSTRUCTOR: "/onboarding/instructor",
};

type GateUser = { role: Role; consent_required: boolean; onboarding_status: string };

/**
 * The one place that decides where a signed-in person goes next. Order matters:
 * 1. consent to the current terms (ONB-4), 2. onboarding, 3. `next` or home.
 * Each gate carries `next` along so nobody loses the page they were heading to.
 *
 * Onboarding: instructors must finish it (admin approval needs it, ONB-3). Learners are sent there
 * once; if they choose "finish later" it becomes IN_PROGRESS and the dashboard offers to resume (ONB-6).
 */
export function afterSignInPath(user: GateUser, next: string | null | undefined): string {
  const target = postLoginPath(user.role, next);
  if (user.consent_required) return `/consent?next=${encodeURIComponent(target)}`;
  const onboarding = ONBOARDING_PATH[user.role];
  const mustOnboard =
    user.role === "INSTRUCTOR" ? user.onboarding_status !== "COMPLETED" : user.onboarding_status === "NOT_STARTED";
  if (onboarding && mustOnboard) {
    return `${onboarding}?next=${encodeURIComponent(target)}`;
  }
  return target;
}
