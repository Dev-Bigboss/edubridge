"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import {
  Category,
  InstructorList,
  Modality,
  TrainingPage,
  TrainingResponse,
  type CategoryInput,
  type ModalityInput,
  type TrainingInput,
} from "@/lib/api/schemas/catalog";
import { PriceQuote, PricingRule, PricingRuleList, type NewPricingRule } from "@/lib/api/schemas/pricing";

export type TrainingFilters = { status?: string; category_id?: string; modality_id?: string; q?: string };

export const adminKeys = {
  trainings: (f: TrainingFilters) => ["admin", "trainings", f] as const,
  training: (id: string) => ["admin", "training", id] as const,
  instructors: ["admin", "instructors"] as const,
  rules: ["admin", "pricing-rules"] as const,
};

export function useAdminTrainings(filters: TrainingFilters) {
  return useApiQuery({
    queryKey: adminKeys.trainings(filters),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api("/admin/trainings", { query: filters, schema: TrainingPage, signal }),
  });
}

export function useAdminTraining(id: string | null) {
  return useApiQuery({
    queryKey: adminKeys.training(id ?? ""),
    enabled: !!id,
    queryFn: ({ signal }) => api(`/admin/trainings/${id}`, { schema: TrainingResponse, signal }).then((r) => r.training),
  });
}

export function useSaveTraining(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TrainingInput) =>
      api(id ? `/admin/trainings/${id}` : "/admin/trainings", { method: id ? "PATCH" : "POST", body, schema: TrainingResponse }),
    onSuccess: ({ training }) => {
      qc.setQueryData(adminKeys.training(training.id), training);
      void qc.invalidateQueries({ queryKey: ["admin", "trainings"] });
    },
  });
}

export function useTrainingAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "publish" | "unpublish" | "archive") =>
      api(`/admin/trainings/${id}/${action}`, { method: "POST", schema: TrainingResponse }),
    onSuccess: ({ training }) => {
      qc.setQueryData(adminKeys.training(training.id), training);
      void qc.invalidateQueries({ queryKey: ["admin", "trainings"] });
    },
  });
}

export function useAdminInstructors() {
  return useApiQuery({
    queryKey: adminKeys.instructors,
    queryFn: ({ signal }) => api("/admin/instructors", { schema: InstructorList, signal }).then((r) => r.items),
  });
}

export function useSaveCategory(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CategoryInput>) =>
      api(id ? `/admin/categories/${id}` : "/admin/categories", {
        method: id ? "PATCH" : "POST",
        body,
        schema: z.object({ category: Category }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "categories"] }),
  });
}

export function useSaveModality(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ModalityInput>) =>
      api(id ? `/admin/modalities/${id}` : "/admin/modalities", {
        method: id ? "PATCH" : "POST",
        body,
        schema: z.object({ modality: Modality }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", "modalities"] }),
  });
}

export function usePricingRules() {
  return useApiQuery({
    queryKey: adminKeys.rules,
    queryFn: ({ signal }) => api("/admin/pricing/rules", { schema: PricingRuleList, signal }).then((r) => r.items),
  });
}

export function useAddPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewPricingRule) =>
      api("/admin/pricing/rules", { method: "POST", body, schema: z.object({ rule: PricingRule }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.rules });
      void qc.invalidateQueries({ queryKey: ["quote"] });
    },
  });
}

/** PRC-4 preview: what a learner would pay for this training (and instructor) at `at`. */
export function useQuote(params: { training_id: string | null; instructor_id?: string | null; at?: string | null }) {
  return useApiQuery({
    queryKey: ["quote", params],
    enabled: !!params.training_id,
    retry: false,
    queryFn: ({ signal }) => api("/pricing/quote", { query: params, schema: PriceQuote, signal }),
  });
}
