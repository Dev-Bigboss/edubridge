"use client";

import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { CategoryList, ModalityList } from "@/lib/api/schemas/catalog";

export const catalogKeys = {
  categories: (includeInactive: boolean) => ["catalog", "categories", { includeInactive }] as const,
  modalities: ["catalog", "modalities"] as const,
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
