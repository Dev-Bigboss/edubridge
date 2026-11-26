"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { DeletionCheck, MfaSetup, MyProfileResponse, Preferences, type ChangePassword, type DeleteAccount } from "@/lib/api/schemas/account";
import { SessionResponse, User } from "@/lib/api/schemas/auth";
import { sessionKey } from "@/lib/auth/session";

const KEY = ["me", "profile"] as const;
const PREFS = ["me", "notification-preferences"] as const;

export function useMyProfile() {
  return useApiQuery({ queryKey: KEY, queryFn: ({ signal }) => api("/me/profile", { schema: MyProfileResponse, signal }).then((r) => r.profile) });
}

export type ProfileUpdate = {
  name: string;
  avatar_file_id: string | null;
  timezone: string;
  country: string | null;
  headline: string | null;
  bio: string | null;
};

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => api("/me/profile", { method: "PATCH", body, schema: MyProfileResponse.extend({ user: User }) }),
    onSuccess: ({ profile, user }) => {
      qc.setQueryData(KEY, profile);
      // Name and time zone show across the app (header, times), so the session updates too.
      qc.setQueryData(sessionKey, user);
    },
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePassword) => api("/me/password", { method: "POST", body }) });
}

export function useMfa() {
  const qc = useQueryClient();
  const setUser = ({ user }: { user: User }) => qc.setQueryData(sessionKey, user);
  return {
    setup: useMutation({ mutationFn: () => api("/me/mfa/setup", { method: "POST", schema: MfaSetup }) }),
    enable: useMutation({ mutationFn: (code: string) => api("/me/mfa/enable", { method: "POST", body: { code }, schema: SessionResponse }), onSuccess: setUser }),
    disable: useMutation({ mutationFn: (password: string) => api("/me/mfa/disable", { method: "POST", body: { password }, schema: SessionResponse }), onSuccess: setUser }),
  };
}

export function useRevokeOtherSessions() {
  return useMutation({ mutationFn: () => api("/me/sessions/revoke-others", { method: "POST", schema: z.object({ revoked: z.number().int() }) }) });
}

export function usePreferences() {
  return useApiQuery({ queryKey: PREFS, queryFn: ({ signal }) => api("/me/notification-preferences", { schema: Preferences, signal }).then((r) => r.items) });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Preferences["items"]) => api("/me/notification-preferences", { method: "PUT", body: { items }, schema: Preferences }),
    onSuccess: (r) => qc.setQueryData(PREFS, r.items),
  });
}

/** NFR Privacy: everything held about me, saved as a JSON file. */
export function useDataExport() {
  return useMutation({
    mutationFn: async () => {
      const data = await api("/me/data-export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `edubridge-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    },
  });
}

export function useDeletionCheck() {
  return useApiQuery({ queryKey: ["me", "deletion"], queryFn: ({ signal }) => api("/me/deletion", { schema: DeletionCheck, signal }) });
}

/** Deletes the account; the caller clears the cache and leaves the signed-in area. */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DeleteAccount) => api("/me/deletion", { method: "POST", body }),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(sessionKey, null);
    },
    onError: () => void qc.invalidateQueries({ queryKey: ["me", "deletion"] }),
  });
}
