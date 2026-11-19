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
