"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AdminUserDetail, AdminUserPage, type UserAction, type UserFilters } from "@/lib/api/schemas/admin-users";
import { SessionResponse } from "@/lib/api/schemas/auth";
import { sessionKey } from "@/lib/auth/session";

export function useAdminUsers(filters: UserFilters) {
  return useApiQuery({
    queryKey: ["admin", "users", filters],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api("/admin/users", { query: filters, schema: AdminUserPage, signal }),
  });
}

export function useAdminUser(id: string) {
  return useApiQuery({
    queryKey: ["admin", "user", id],
    queryFn: ({ signal }) => api(`/admin/users/${encodeURIComponent(id)}`, { schema: AdminUserDetail, signal }),
  });
}

export function useUserAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, reason }: { action: UserAction; reason?: string }) =>
      api(`/admin/users/${id}/${action}`, { method: "POST", body: reason ? { reason } : {} }),
    onSuccess: async (_res, { action }) => {
      if (action === "impersonate") {
        // A different person is now signed in: nothing cached for the admin may show.
        qc.clear();
        await qc.invalidateQueries({ queryKey: sessionKey });
        return;
      }
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "user", id] });
    },
  });
}

/** ADM-2: leave "view as" and go back to the admin's own session. */
export function useEndImpersonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/auth/impersonation/end", { method: "POST", schema: SessionResponse }),
    onSuccess: ({ user }) => {
      qc.clear();
      qc.setQueryData(sessionKey, user);
    },
  });
}
