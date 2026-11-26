"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiReady } from "@/components/providers";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AuditPage, type AuditFilters, type AuditPage as AuditPageT } from "@/lib/api/schemas/admin-users";
import { SettingsResponse, type SettingsInput } from "@/lib/api/schemas/settings";

const KEY = ["admin", "settings"] as const;

export function useSettings() {
  return useApiQuery({ queryKey: KEY, queryFn: ({ signal }) => api("/admin/settings", { schema: SettingsResponse, signal }) });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsInput & { version: number }) => api("/admin/settings", { method: "PUT", body, schema: SettingsResponse }),
    onSuccess: (res) => {
      qc.setQueryData(KEY, res);
      void qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export function useAuditLog(filters: AuditFilters) {
  const ready = useApiReady();
  return useInfiniteQuery({
    queryKey: ["admin", "audit", filters],
    enabled: ready,
    initialPageParam: null as string | null,
    getNextPageParam: (last: AuditPageT) => last.next_cursor,
    queryFn: ({ pageParam, signal }) => api("/admin/audit-log", { query: { ...filters, cursor: pageParam }, schema: AuditPage, signal }),
  });
}
