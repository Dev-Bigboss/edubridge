"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AdminCohort, AdminCohortList, type CohortAction, type CohortInput } from "@/lib/api/schemas/cohort";

export type CohortFilters = { training_id?: string; status?: string };

const AdminCohortResponse = z.object({ cohort: AdminCohort });

export function useAdminCohorts(filters: CohortFilters) {
  return useApiQuery({
    queryKey: ["admin", "cohorts", filters],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api("/admin/cohorts", { query: filters, schema: AdminCohortList, signal }),
  });
}

/** After any cohort change, admin lists and the public catalogue (seats, status) are stale. */
function useInvalidateCohorts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["admin", "cohorts"] });
    void qc.invalidateQueries({ queryKey: ["catalog"] });
  };
}

export function useSaveCohort(id: string | null) {
  const invalidate = useInvalidateCohorts();
  return useMutation({
    mutationFn: (body: CohortInput) =>
      api(id ? `/admin/cohorts/${id}` : "/admin/cohorts", { method: id ? "PATCH" : "POST", body, schema: AdminCohortResponse }),
    onSuccess: invalidate,
  });
}

/** A repeated cancel can't refund twice: the second call is refused, since CANCELLED can't move again. */
export function useCohortAction(id: string) {
  const invalidate = useInvalidateCohorts();
  return useMutation({
    mutationFn: ({ action, reason }: { action: CohortAction; reason?: string }) =>
      api(`/admin/cohorts/${id}/${action}`, {
        method: "POST",
        body: action === "cancel" ? { reason } : undefined,
        schema: AdminCohortResponse,
      }),
    onSuccess: invalidate,
  });
}
