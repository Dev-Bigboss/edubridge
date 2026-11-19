"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/spinner";
import type { User } from "@/lib/api/schemas/auth";
import { ROLE_HOME, afterSignInPath } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session";
import type { Role } from "@/lib/domain/enums";

/**
 * Client-side gate for a role area. This is for UX only: the API enforces access on every call
 * (SRS NFR Security, RBAC), so a bypassed guard shows an empty shell, never someone else's data.
 */
export function RequireRole({ role, children }: { role: Role; children: (user: User) => ReactNode }) {
  const { data: user, isPending, isError } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const signedOut = !isPending && !isError && user === null;
  const wrongRole = !!user && user.role !== role;
  // Consent (ONB-4) and required onboarding come before any role page; they bring the person back here.
  const gate = user && !wrongRole ? afterSignInPath(user, pathname) : null;
  const gated = !!gate && (gate.startsWith("/consent") || gate.startsWith("/onboarding"));

  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (wrongRole && user) router.replace(ROLE_HOME[user.role]);
    else if (gated && gate) router.replace(gate);
  }, [signedOut, wrongRole, gated, gate, user, pathname, router]);

  if (isError) {
    return <LoadingState label="We couldn't check your sign-in. Retrying" />;
  }
  if (!user || wrongRole || gated) return <LoadingState />;
  return <>{children(user)}</>;
}
