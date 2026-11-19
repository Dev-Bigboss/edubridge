"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api/client";
import {
  LoginResponse,
  RegisterResponse,
  SessionResponse,
  type LegalVersions,
  type LoginRequest,
  type MfaVerifyRequest,
  type RegisterRequest,
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

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterRequest) => api("/auth/register", { method: "POST", body, schema: RegisterResponse }),
  });
}

/** Redeems the emailed link. The backend signs the person in, so the session cache is set. */
export function useVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api("/auth/email/verify", { method: "POST", body: { token }, schema: SessionResponse }),
    onSuccess: (res) => qc.setQueryData(sessionKey, res.user),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) => api("/auth/email/resend", { method: "POST", body: { email } }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api("/auth/password/forgot", { method: "POST", body: { email } }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { token: string; password: string }) =>
      api("/auth/password/reset", { method: "POST", body }),
    // A reset ends every session on the backend, so forget any cached one here too.
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(sessionKey, null);
    },
  });
}

export function useAcceptConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LegalVersions) => api("/auth/consent", { method: "POST", body, schema: SessionResponse }),
    onSuccess: (res) => qc.setQueryData(sessionKey, res.user),
  });
}
