"use client";

import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { LearnerEnrolmentList, PaymentList } from "@/lib/api/schemas/payments";

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
