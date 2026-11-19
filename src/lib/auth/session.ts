"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api/client";
import {
  LoginResponse,
  SessionResponse,
  type LoginRequest,
  type MfaVerifyRequest,
  type User,
} from "@/lib/api/schemas/auth";
import { useApiReady } from "@/components/providers";

export const sessionKey = ["session"] as const;

/** Current user, or null when signed out. A 401 is "signed out", not an error. */
export function useSession() {
  const ready = useApiReady();
  return useQuery({
    queryKey: sessionKey,
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<User | null> => {
      try {
        const res = await api("/auth/me", { schema: SessionResponse, signal });
        return res.user;
      } catch (err) {
        if (err instanceof ApiError && err.isUnauthorised) return null;
        throw err;
      }
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => api("/auth/login", { method: "POST", body, schema: LoginResponse }),
    onSuccess: (res) => {
      if (!res.mfa_required) qc.setQueryData(sessionKey, res.user);
    },
  });
}

export function useVerifyMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MfaVerifyRequest) =>
      api("/auth/mfa/verify", { method: "POST", body, schema: SessionResponse }),
    onSuccess: (res) => qc.setQueryData(sessionKey, res.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSettled: () => {
      // Drop every cached query so the next person on this device sees nothing of the last one.
      qc.clear();
      qc.setQueryData(sessionKey, null);
    },
  });
}
