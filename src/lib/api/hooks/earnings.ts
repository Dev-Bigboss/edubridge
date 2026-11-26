"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { API_BASE_URL, ApiError, api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AdminPayoutList, EarningsSummary, PayoutResponse, Reconciliation } from "@/lib/api/schemas/earnings";
import type { PayoutSchedule } from "@/lib/domain/earnings";

export function useEarnings() {
  return useApiQuery({ queryKey: ["teach", "earnings"], queryFn: ({ signal }) => api("/teach/earnings", { schema: EarningsSummary, signal }) });
}

/** PAY-7/8: one Idempotency-Key per page visit, so a double click or a retry pays out once. */
export function useRequestPayout() {
  const qc = useQueryClient();
  const key = useRef<string | null>(null);
  return useMutation({
    mutationFn: () => {
      key.current ??= crypto.randomUUID();
      return api("/teach/payouts", { method: "POST", idempotencyKey: key.current, schema: PayoutResponse }).then((r) => r.payout);
    },
    onSuccess: () => {
      key.current = null;
      void qc.invalidateQueries({ queryKey: ["teach", "earnings"] });
    },
  });
}

export function useSaveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (schedule: PayoutSchedule) => api("/teach/payout-schedule", { method: "PUT", body: { schedule } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teach", "earnings"] }),
  });
}

export function useAdminPayouts(status: string | null) {
  return useApiQuery({ queryKey: ["admin", "payouts", status], queryFn: ({ signal }) => api("/admin/payouts", { query: { status }, schema: AdminPayoutList, signal }) });
}

export function useReconciliation(from: string, to: string) {
  return useApiQuery({
    queryKey: ["admin", "reconciliation", from, to],
    enabled: !!from && !!to && from <= to,
    queryFn: ({ signal }) => api("/admin/reconciliation", { query: { from, to }, schema: Reconciliation, signal }),
  });
}

/** Downloads the CSV through the browser (cookies included), without leaving the page. */
export async function downloadReconciliationCsv(from: string, to: string) {
  const res = await fetch(`${API_BASE_URL}/admin/reconciliation?from=${from}&to=${to}&format=csv`, { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, { code: "EXPORT_FAILED", message: "The export didn't download. Try again." });
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `reconciliation-${from}-to-${to}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
