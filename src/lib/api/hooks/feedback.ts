"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { FeedbackList, FeedbackResponse, RubricList, RubricResponse, SessionFeedback, type FeedbackInput, type RubricInput } from "@/lib/api/schemas/feedback";

const path = (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/feedback`;

export function useSessionFeedback(sessionId: string) {
  return useApiQuery({ queryKey: ["teach", "feedback", sessionId], queryFn: ({ signal }) => api(path(sessionId), { schema: SessionFeedback, signal }) });
}

export function useSaveFeedback(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ learnerId, body }: { learnerId: string; body: FeedbackInput }) =>
      api(`${path(sessionId)}/${learnerId}`, { method: "PUT", body, schema: FeedbackResponse }).then((r) => r.feedback),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teach", "feedback", sessionId] }),
  });
}

export function useMyFeedback(trainingId: string | null) {
  return useApiQuery({
    queryKey: ["me", "feedback", trainingId],
    queryFn: ({ signal }) => api("/me/feedback", { query: { training_id: trainingId }, schema: FeedbackList, signal }).then((r) => r.items),
  });
}

export function useRubrics() {
  return useApiQuery({ queryKey: ["admin", "rubrics"], queryFn: ({ signal }) => api("/admin/rubrics", { schema: RubricList, signal }).then((r) => r.items) });
}

export function useSaveRubric(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RubricInput) => api(id ? `/admin/rubrics/${id}` : "/admin/rubrics", { method: id ? "PUT" : "POST", body, schema: RubricResponse }).then((r) => r.rubric),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "rubrics"] }),
  });
}

export function useArchiveRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) => api(`/admin/rubrics/${id}/${archive ? "archive" : "restore"}`, { method: "POST", schema: RubricResponse }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "rubrics"] }),
  });
}
