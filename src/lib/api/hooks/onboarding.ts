"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { SessionResponse } from "@/lib/api/schemas/auth";
import { OnboardingState, PayoutLinkResponse, SubmitResponse, type OnboardingStep } from "@/lib/api/schemas/onboarding";
import { sessionKey } from "@/lib/auth/session";

export const onboardingKey = ["onboarding"] as const;

export function useOnboarding() {
  return useApiQuery({
    queryKey: onboardingKey,
    queryFn: ({ signal }) => api("/onboarding", { schema: OnboardingState, signal }),
  });
}

/** Saves one step. The profile step also changes the user's name, zone and photo, so refresh the session. */
export function useSaveSection(section: Exclude<OnboardingStep, "payout">) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api(`/onboarding/sections/${section}`, { method: "PUT", body, schema: OnboardingState }),
    onSuccess: (state) => {
      qc.setQueryData(onboardingKey, state);
      if (section === "profile") void qc.invalidateQueries({ queryKey: sessionKey });
    },
  });
}

export function usePayoutLink() {
  return useMutation({
    mutationFn: () => api("/onboarding/payout-link", { method: "POST", schema: PayoutLinkResponse }),
  });
}

export function useDeferOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/onboarding/defer", { method: "POST", schema: SessionResponse }),
    onSuccess: (res) => qc.setQueryData(sessionKey, res.user),
  });
}

export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/onboarding/submit", { method: "POST", schema: SubmitResponse }),
    onSuccess: (res) => {
      qc.setQueryData(sessionKey, res.user);
      void qc.invalidateQueries({ queryKey: onboardingKey });
    },
  });
}
