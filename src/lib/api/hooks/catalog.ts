"use client";

import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { keepPreviousData } from "@tanstack/react-query";
import { CatalogPage, CategoryList, ModalityList, PublicCohortResponse, PublicTrainingResponse } from "@/lib/api/schemas/catalog";
import type { CatalogFilters } from "@/lib/domain/catalog";

export const catalogKeys = {
  categories: (includeInactive: boolean) => ["catalog", "categories", { includeInactive }] as const,
  modalities: ["catalog", "modalities"] as const,
  trainings: (f: CatalogFilters) => ["catalog", "trainings", f] as const,
  training: (slug: string) => ["catalog", "training", slug] as const,
  cohort: (id: string) => ["catalog", "cohort", id] as const,
};

/** Public list. Admin screens pass includeInactive to see disabled ones too. */
export function useCategories({ includeInactive = false } = {}) {
  return useApiQuery({
    queryKey: catalogKeys.categories(includeInactive),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      api("/catalog/categories", {
        query: { include_inactive: includeInactive || undefined },
        schema: CategoryList,
        signal,
      }).then((r) => r.items),
  });
}

export function useModalities() {
  return useApiQuery({
    queryKey: catalogKeys.modalities,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => api("/catalog/modalities", { schema: ModalityList, signal }).then((r) => r.items),
  });
}

/** TRN-6: published trainings with search, filters and sort. Keeps the old list while a new filter loads. */
export function useCatalog(filters: CatalogFilters) {
  return useApiQuery({
    queryKey: catalogKeys.trainings(filters),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: ({ signal }) => api("/catalog/trainings", { query: filters, schema: CatalogPage, signal }),
  });
}

export function useCatalogTraining(slug: string) {
  return useApiQuery({
    queryKey: catalogKeys.training(slug),
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      api(`/catalog/trainings/${encodeURIComponent(slug)}`, { schema: PublicTrainingResponse, signal }).then((r) => r.training),
  });
}

/** The cohort being bought, with its training (checkout). Seats change, so it's never served stale. */
export function useCatalogCohort(id: string) {
  return useApiQuery({
    queryKey: catalogKeys.cohort(id),
    staleTime: 0,
    queryFn: ({ signal }) => api(`/catalog/cohorts/${encodeURIComponent(id)}`, { schema: PublicCohortResponse, signal }),
  });
}
