"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { User } from "@/lib/api/schemas/auth";
import { ROLE_HOME, afterSignInPath, safeNextPath } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session";

/**
 * Keeps people on the right onboarding page: signed out → sign in (and back), wrong role or
 * consent owed → wherever the gates say. Returns the user once they belong here.
 */
export function useOnboardingGuard(role: "LEARNER" | "INSTRUCTOR", { allowCompleted = false } = {}): User | null {
  const { data: user, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const signedOut = !isPending && user === null;
  const misplaced =
    !!user && (user.role !== role || user.consent_required || (user.onboarding_status === "COMPLETED" && !allowCompleted));

  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(`${pathname}?${params}`)}`);
    else if (user && misplaced) {
      router.replace(user.role === role ? afterSignInPath(user, safeNextPath(params.get("next"))) : ROLE_HOME[user.role]);
    }
  }, [signedOut, misplaced, user, role, router, pathname, params]);

  return user && !misplaced ? user : null;
}

/** Current step from ?step=, else the first unfinished one. Steps live in the URL so Back works. */
export function useWizardStep<K extends string>(steps: readonly K[], completed: string[] | undefined) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("step") as K | null;
  const firstOpen = steps.find((s) => !completed?.includes(s)) ?? steps[steps.length - 1];
  const current = requested && steps.includes(requested) ? requested : firstOpen;

  const goTo = (key: K) => {
    const next = new URLSearchParams(params);
    next.set("step", key);
    next.delete("payout");
    router.push(`?${next}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const index = steps.indexOf(current);
  return {
    current,
    goTo,
    next: () => index < steps.length - 1 && goTo(steps[index + 1]),
    back: index > 0 ? () => goTo(steps[index - 1]) : undefined,
    nextParam: safeNextPath(params.get("next")),
  };
}
