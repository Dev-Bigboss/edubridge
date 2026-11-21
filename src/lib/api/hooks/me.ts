"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { LearnerEnrolmentList, PaymentList, type ChecklistItem } from "@/lib/api/schemas/payments";

export function useMyEnrolments() {
  return useApiQuery({
    queryKey: ["me", "enrolments"],
    queryFn: ({ signal }) => api("/me/enrolments", { schema: LearnerEnrolmentList, signal }),
  });
}

export function useMyPayments() {
  return useApiQuery({
    queryKey: ["me", "payments"],
    queryFn: ({ signal }) => api("/me/payments", { schema: PaymentList, signal }),
  });
}

/** ONB-5: tick a checklist step or hide the checklist. Fire-and-forget from links that open elsewhere. */
export function useChecklist(enrolmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { item: ChecklistItem } | { dismiss: true }) => api(`/me/enrolments/${enrolmentId}/checklist`, { method: "POST", body }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["me", "enrolments"] }),
  });
}
