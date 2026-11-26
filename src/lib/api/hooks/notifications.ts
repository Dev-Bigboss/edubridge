"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiReady } from "@/components/providers";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { NotificationPage, UnreadCount, type NotificationPage as Page } from "@/lib/api/schemas/notifications";

const KEY = ["me", "notifications"] as const;

/** The bell's number. Polled every minute until push (WebSocket) arrives with messaging in Phase 3. */
export function useUnreadCount() {
  return useApiQuery({
    queryKey: [...KEY, "unread"],
    refetchInterval: 60_000,
    queryFn: ({ signal }) => api("/me/notifications/unread-count", { schema: UnreadCount, signal }).then((r) => r.unread_count),
  });
}

export function useNotifications({ unreadOnly = false, limit = 20 } = {}) {
  const ready = useApiReady();
  return useInfiniteQuery({
    queryKey: [...KEY, "list", { unreadOnly, limit }],
    enabled: ready,
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page) => last.next_cursor,
    queryFn: ({ pageParam, signal }) =>
      api("/me/notifications", {
        query: { unread_only: unreadOnly || undefined, limit, cursor: pageParam },
        schema: NotificationPage,
        signal,
      }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | "all") =>
      api(id === "all" ? "/me/notifications/read-all" : `/me/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
