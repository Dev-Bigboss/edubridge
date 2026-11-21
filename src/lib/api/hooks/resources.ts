"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AudienceOptions, ResourceList, ResourceResponse, TeachingTrainings, type ResourceInput } from "@/lib/api/schemas/resources";

export function useTeachingTrainings() {
  return useApiQuery({ queryKey: ["teach", "trainings"], queryFn: ({ signal }) => api("/teach/trainings", { schema: TeachingTrainings, signal }).then((r) => r.items) });
}

export function useAudienceOptions(trainingId: string | null) {
  return useApiQuery({
    queryKey: ["teach", "audiences", trainingId],
    enabled: !!trainingId,
    queryFn: ({ signal }) => api(`/teach/trainings/${trainingId}/audiences`, { schema: AudienceOptions, signal }),
  });
}

export function useTeachResources(trainingId: string | null) {
  return useApiQuery({
    queryKey: ["teach", "resources", trainingId],
    enabled: !!trainingId,
    queryFn: ({ signal }) => api("/teach/resources", { query: { training_id: trainingId }, schema: ResourceList, signal }).then((r) => r.items),
  });
}

export function useMyResources(trainingId: string | null) {
  return useApiQuery({
    queryKey: ["me", "resources", trainingId],
    queryFn: ({ signal }) => api("/me/resources", { query: { training_id: trainingId }, schema: ResourceList, signal }).then((r) => r.items),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["teach", "resources"] });
    void qc.invalidateQueries({ queryKey: ["teach", "audiences"] });
  };
}

export function useSaveResource(id: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: ResourceInput) =>
      api(id ? `/resources/${id}` : "/teach/resources", { method: id ? "PATCH" : "POST", body, schema: ResourceResponse }).then((r) => r.resource),
    onSuccess: invalidate,
  });
}

export function useDeleteResource() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api(`/resources/${id}`, { method: "DELETE" }), onSuccess: invalidate });
}

export function useReorderResources() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (ids: string[]) => api("/teach/resources/reorder", { method: "POST", body: { ids }, schema: ResourceList }), onSuccess: invalidate });
}
