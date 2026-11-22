"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AdminReviewList, MyReviewResponse, ReviewableList, TrainingReviews, type ReviewInput } from "@/lib/api/schemas/reviews";

export function useTrainingReviews(trainingId: string) {
  return useApiQuery({ queryKey: ["reviews", trainingId], queryFn: ({ signal }) => api(`/trainings/${trainingId}/reviews`, { schema: TrainingReviews, signal }) });
}

export function useReviewables(enabled = true) {
  return useApiQuery({ queryKey: ["me", "reviewables"], enabled, queryFn: ({ signal }) => api("/me/reviewables", { schema: ReviewableList, signal }).then((r) => r.items) });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["me", "reviewables"] });
    void qc.invalidateQueries({ queryKey: ["reviews"] });
    void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  };
}

export function useSaveReview() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: ReviewInput) => api("/me/reviews", { method: "PUT", body, schema: MyReviewResponse }).then((r) => r.review), onSuccess: invalidate });
}

export function useDeleteReview() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api(`/me/reviews/${id}`, { method: "DELETE" }), onSuccess: invalidate });
}

export function useAdminReviews(status: "PUBLISHED" | "HIDDEN") {
  return useApiQuery({ queryKey: ["admin", "reviews", status], queryFn: ({ signal }) => api("/admin/reviews", { query: { status }, schema: AdminReviewList, signal }).then((r) => r.items) });
}

export function useModerateReview() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) =>
      api(`/admin/reviews/${id}/${reason === null ? "restore" : "hide"}`, { method: "POST", body: reason === null ? undefined : { reason } }),
    onSuccess: invalidate,
  });
}
