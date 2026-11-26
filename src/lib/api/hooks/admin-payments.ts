"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useApiReady } from "@/components/providers";
import { api } from "@/lib/api/client";
import { AdminPaymentPage, type AdminPaymentFilters, type AdminPaymentPage as Page, type RefundRequest } from "@/lib/api/schemas/payments";

export function useAdminPayments(filters: AdminPaymentFilters) {
  const ready = useApiReady();
  return useInfiniteQuery({
    queryKey: ["admin", "payments", filters],
    enabled: ready,
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page) => last.next_cursor,
    queryFn: ({ pageParam, signal }) => api("/admin/payments", { query: { ...filters, cursor: pageParam }, schema: AdminPaymentPage, signal }),
  });
}

/** PAY-5/8: one Idempotency-Key per open refund dialog, so a double click or retry refunds once. */
export function useRefund(paymentId: string) {
  const qc = useQueryClient();
  const key = useRef(crypto.randomUUID());
  return useMutation({
    mutationFn: (body: RefundRequest) => api(`/admin/payments/${paymentId}/refund`, { method: "POST", body, idempotencyKey: key.current }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "payments"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      void qc.invalidateQueries({ queryKey: ["admin", "cohorts"] });
    },
    // A refused refund (validation, conflict) gets a fresh key for the corrected attempt.
    onError: () => (key.current = crypto.randomUUID()),
  });
}
