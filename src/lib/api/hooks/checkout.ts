"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { CheckoutSession, CohortCheckout, Payment, PaymentDetail } from "@/lib/api/schemas/payments";

export function useCohortCheckout(cohortId: string) {
  return useApiQuery({
    queryKey: ["checkout", "cohort", cohortId],
    staleTime: 0,
    queryFn: ({ signal }) => api(`/checkout/cohorts/${encodeURIComponent(cohortId)}`, { schema: CohortCheckout, signal }),
  });
}

/**
 * PAY-1/8: one Idempotency-Key per checkout page visit, so a double click or a retry after a
 * network blip returns the same gateway session instead of creating a second one.
 */
export function useStartCheckout() {
  const key = useRef<string | null>(null);
  return useMutation({
    mutationFn: (cohortId: string) => {
      key.current ??= crypto.randomUUID();
      return api("/checkout/sessions", { method: "POST", body: { cohort_id: cohortId }, idempotencyKey: key.current, schema: CheckoutSession });
    },
    // A refused attempt (e.g. the cohort just filled) gets a fresh key next time.
    onError: () => (key.current = null),
  });
}

/** PAY-2: poll while the payment waits for the gateway's webhook; stop once it's settled. */
export function usePayment(id: string | null) {
  return useApiQuery({
    queryKey: ["payment", id],
    enabled: !!id,
    queryFn: ({ signal }) => api(`/payments/${id}`, { schema: PaymentDetail, signal }),
    refetchInterval: (q) => (q.state.data?.payment.status === "PENDING" ? 1500 : false),
  });
}

/* ---------- mock gateway (mock mode only) ---------- */

const GatewaySession = z.object({ payment: Payment, cohort_id: z.string(), total: z.string() });

export function useMockGateway(id: string) {
  return useApiQuery({
    queryKey: ["mock-gateway", id],
    queryFn: ({ signal }) => api(`/mock/gateway/${id}`, { schema: GatewaySession, signal }),
  });
}

export function useMockGatewayOutcome(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outcome: "success" | "decline" | "cancel") => api(`/mock/gateway/${id}/${outcome}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment", id] }),
  });
}
