"use client";

import { z } from "zod";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useApiReady } from "@/components/providers";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import {
  ContactList,
  Conversation,
  ConversationList,
  ConversationResponse,
  MessagePage,
  MessageResponse,
  MessageReportDetail,
  MessageReportList,
  UnreadMessages,
  type Message,
  type ReportInput,
  type ResolveReportInput,
  type OpenConversationInput,
  type SendMessageInput,
} from "@/lib/api/schemas/messages";

const KEY = ["me", "conversations"] as const;

/**
 * MSG-3: the backend pushes new messages over WebSocket (messages.yaml). Until that socket is wired,
 * and whenever it drops, these intervals keep things fresh: list 15 s, open conversation 5 s, badge 30 s.
 */
export const POLL = { list: 15_000, open: 5_000, badge: 30_000 } as const;

export function useConversations() {
  return useApiQuery({
    queryKey: [...KEY, "list"],
    refetchInterval: POLL.list,
    queryFn: ({ signal }) => api("/me/conversations", { schema: ConversationList, signal }).then((r) => r.items),
  });
}

/** The sidebar's Messages badge. */
export function useUnreadMessages(enabled = true) {
  return useApiQuery({
    queryKey: [...KEY, "unread"],
    enabled,
    refetchInterval: POLL.badge,
    queryFn: ({ signal }) => api("/me/conversations/unread-count", { schema: UnreadMessages, signal }).then((r) => r.unread_count),
  });
}

export function useConversation(id: string | null) {
  return useApiQuery({
    queryKey: [...KEY, "one", id],
    enabled: !!id,
    refetchInterval: POLL.open,
    queryFn: ({ signal }) => api(`/conversations/${id}`, { schema: ConversationResponse, signal }).then((r) => r.conversation),
  });
}

type Pages = InfiniteData<MessagePage, string | null>;

/** History: the first page is the newest; older pages load on request. */
export function useMessages(id: string | null) {
  const ready = useApiReady();
  return useInfiniteQuery({
    queryKey: [...KEY, "messages", id],
    enabled: ready && !!id,
    refetchInterval: POLL.open,
    initialPageParam: null as string | null,
    getNextPageParam: (last: MessagePage) => last.next_cursor,
    queryFn: ({ pageParam, signal }) => api(`/conversations/${id}/messages`, { query: { before: pageParam, limit: 30 }, schema: MessagePage, signal }),
  });
}

export function useContacts(enabled = true) {
  return useApiQuery({
    queryKey: ["me", "contacts"],
    enabled,
    queryFn: ({ signal }) => api("/me/contacts", { schema: ContactList, signal }).then((r) => r.items),
  });
}

export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OpenConversationInput) => api("/me/conversations", { method: "POST", body, schema: ConversationResponse }).then((r) => r.conversation),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["me", "contacts"] });
    },
  });
}

/** Adds the sent message to the newest page straight away, then refreshes the list's preview. */
export function useSendMessage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageInput) =>
      api(`/conversations/${id}/messages`, { method: "POST", body, idempotencyKey: body.client_id, schema: MessageResponse }).then((r) => r.message),
    onSuccess: (message: Message) => {
      qc.setQueryData<Pages>([...KEY, "messages", id], (data) => {
        if (!data?.pages.length || data.pages.some((p) => p.items.some((m) => m.id === message.id))) return data;
        const [newest, ...rest] = data.pages;
        return { ...data, pages: [{ ...newest, items: [...newest.items, message] }, ...rest] };
      });
      void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
      void qc.invalidateQueries({ queryKey: [...KEY, "one", id] });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/conversations/${id}/read`, { method: "POST", schema: ConversationResponse }).then((r) => r.conversation),
    onSuccess: (conversation) => {
      qc.setQueryData([...KEY, "one", conversation.id], conversation);
      void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
      void qc.invalidateQueries({ queryKey: [...KEY, "unread"] });
    },
  });
}

/* ---------- MSG-6 ---------- */

function useConversationUpdate() {
  const qc = useQueryClient();
  return (conversation: Conversation) => {
    qc.setQueryData([...KEY, "one", conversation.id], conversation);
    void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
  };
}

export function useBlockConversation(id: string) {
  const update = useConversationUpdate();
  return useMutation({
    mutationFn: (block: boolean) => api(`/conversations/${id}/${block ? "block" : "unblock"}`, { method: "POST", schema: ConversationResponse }).then((r) => r.conversation),
    onSuccess: update,
  });
}

export function useReportConversation(id: string) {
  const update = useConversationUpdate();
  return useMutation({
    mutationFn: (body: ReportInput) => api(`/conversations/${id}/reports`, { method: "POST", body, schema: ReportResponse }),
    onSuccess: (r) => update(r.conversation),
  });
}

const ReportResponse = z.object({ report_id: z.string(), conversation: Conversation });

const ADMIN_KEY = ["admin", "message-reports"] as const;

export function useMessageReports(status: "OPEN" | "RESOLVED") {
  return useApiQuery({
    queryKey: [...ADMIN_KEY, status],
    queryFn: ({ signal }) => api("/admin/message-reports", { query: { status }, schema: MessageReportList, signal }).then((r) => r.items),
  });
}

export function useMessageReport(id: string | null) {
  return useApiQuery({
    queryKey: [...ADMIN_KEY, "one", id],
    enabled: !!id,
    queryFn: ({ signal }) => api(`/admin/message-reports/${id}`, { schema: MessageReportDetail, signal }),
  });
}

export function useResolveReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ResolveReportInput) => api(`/admin/message-reports/${id}/resolve`, { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}
