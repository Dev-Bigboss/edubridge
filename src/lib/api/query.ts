"use client";

import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { useApiReady } from "@/components/providers";

/** useQuery that waits until the API (or the mock worker) can take requests. Use it for every API read. */
export function useApiQuery<TData, TKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TData, Error, TData, TKey>,
) {
  const ready = useApiReady();
  return useQuery({ ...options, enabled: ready && (options.enabled ?? true) });
}
