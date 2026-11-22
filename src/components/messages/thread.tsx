"use client";

import { ArrowLeft, Ban, CheckCheck, Download, EyeOff, FileText, Lock, Megaphone, MessagesSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { useBlockConversation, useConversation, useMarkConversationRead, useMessages } from "@/lib/api/hooks/messages";
import type { Conversation } from "@/lib/api/schemas/messages";
import { toast } from "sonner";
import { ConversationMenu } from "./safety";
import type { Message } from "@/lib/api/schemas/messages";
import { cn } from "@/lib/cn";
import { groupByDay, mergePages, seenMessageId, startsCluster } from "@/lib/domain/messages";
import { formatInZone } from "@/lib/domain/time";
import { formatBytes } from "@/lib/domain/uploads";
import { Composer } from "./composer";
import { ConversationAvatar } from "./conversation-list";

/** Within this distance of the bottom, new messages scroll into view; further up, the reader is left in place. */
const NEAR_BOTTOM_PX = 120;

/** MSG-3: one conversation, its history and the composer. Marks it read while it's open. */
export function Thread({ id, base, me, zone }: { id: string; base: string; me: string; zone: string }) {
  const t = useTranslations("inbox");
  const conversation = useConversation(id);
  const history = useMessages(id);
  const markRead = useMarkConversationRead();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const firstShown = useRef<string | null>(null);

  const messages = useMemo(() => mergePages(history.data?.pages ?? []), [history.data]);
  const lastId = messages.at(-1)?.id;
  const c = conversation.data;

  // Read while open and the tab is visible; the poll brings new messages, this keeps the badge honest.
  const unread = c?.unread_count ?? 0;
  const { mutate: markAsRead } = markRead;
  useEffect(() => {
    if (unread > 0 && document.visibilityState === "visible") markAsRead(id);
  }, [id, unread, lastId, markAsRead]);

  // Start at the newest message; follow new ones only if the reader is already near the bottom.
  // When older messages load at the top, keep the same message in view.
  const heightBefore = useRef(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const oldestId = messages[0]?.id ?? null;
    if (firstShown.current && oldestId !== firstShown.current && heightBefore.current) {
      el.scrollTop += el.scrollHeight - heightBefore.current;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
    firstShown.current = oldestId;
    heightBefore.current = 0;
  }, [messages]);

  const loadOlder = () => {
    heightBefore.current = scroller.current?.scrollHeight ?? 0;
    void history.fetchNextPage();
  };

  if (conversation.isError || history.isError) {
    return (
      <div className="p-6">
        <LoadError
          onRetry={() => {
            void conversation.refetch();
            void history.refetch();
          }}
        />
      </div>
    );
  }
  if (!c || history.isPending) return <LoadingState label={t("loadingConversation")} />;

  const seen = c.kind === "DIRECT" ? seenMessageId(messages, me, c.other_last_read_at) : null;
  const pinned = c.kind === "COHORT" ? messages.findLast((m) => m.announcement && !m.removed) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border-subtle px-3 py-2 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link href={base} aria-label={t("back")}>
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        </Button>
        <ConversationAvatar c={c} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-base font-semibold text-heading">{c.title}</h2>
          <p className="truncate text-sm">{c.kind === "COHORT" ? t("cohortSubtitle", { training: c.subtitle, count: c.member_count }) : c.subtitle}</p>
        </div>
        <ConversationMenu c={c} messages={messages} me={me} />
      </header>

      {pinned && (
        <div className="flex items-start gap-2 border-b border-accent/40 bg-accent/10 px-4 py-2 text-sm text-heading">
          <Megaphone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="line-clamp-2">
            <span className="font-semibold">{t("latestAnnouncement")}: </span>
            {pinned.body}
          </p>
        </div>
      )}

      <div
        ref={scroller}
        role="log"
        aria-label={t("historyLabel", { name: c.title })}
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-1/60 px-3 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-6"
      >
        {history.hasNextPage && (
          <div className="mb-4 flex justify-center">
            <Button variant="outline" onClick={loadOlder} loading={history.isFetchingNextPage}>
              {t("loadOlder")}
            </Button>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessagesSquare aria-hidden="true" className="mb-3 size-8 text-primary" />
            <p className="font-heading font-semibold text-heading">{t("startTitle", { name: c.title })}</p>
            <p className="max-w-sm text-[15px] leading-relaxed">{c.context === "ENQUIRY" ? t("startEnquiry") : t("startBody")}</p>
          </div>
        ) : (
          groupByDay(messages, zone).map((day) => (
            <section key={day.key} aria-label={day.label} className="mb-2">
              <p className="sticky top-0 z-10 mx-auto my-3 w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-heading shadow-[0_1px_3px_rgba(8,42,94,0.12)]">{day.label}</p>
              <ul className="space-y-1">
                {day.items.map((m, i) => (
                  <MessageRow key={m.id} m={m} mine={m.sender.id === me} header={startsCluster(day.items[i - 1], m)} zone={zone} cohort={c.kind === "COHORT"} seen={m.id === seen} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {c.blocked ? (
        <BlockedFooter c={c} />
      ) : c.can_post ? (
        <Composer key={c.id} conversation={c} onSent={() => (stick.current = true)} />
      ) : (
        <p className="flex items-center gap-2 border-t border-border-subtle bg-white px-4 py-4 text-[15px]">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t("readOnly")}
        </p>
      )}
    </div>
  );
}

function MessageRow({ m, mine, header, zone, cohort, seen }: { m: Message; mine: boolean; header: boolean; zone: string; cohort: boolean; seen: boolean }) {
  const t = useTranslations("inbox");
  const time = formatInZone(m.created_at, zone, "HH:mm");
  return (
    <li className={cn("flex flex-col", mine ? "items-end" : "items-start", header && "pt-2")}>
      {header && (
        <p className="mb-1 px-1 text-xs">
          {!mine && <span className="font-semibold text-heading">{m.sender.name}</span>}
          {!mine && m.sender.role === "INSTRUCTOR" && cohort && <span> · {t("instructor")}</span>}
          {!mine && " · "}
          <time dateTime={m.created_at}>{time}</time>
        </p>
      )}
      {m.removed ? (
        <p className="flex max-w-[min(85%,560px)] items-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2 text-[15px] italic">
          <EyeOff aria-hidden="true" className="size-4 shrink-0" />
          {t("removed")}
        </p>
      ) : (
      <div
        className={cn(
          "max-w-[min(85%,560px)] rounded-lg px-3.5 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap",
          m.announcement ? "border border-accent/60 bg-accent/10 text-heading" : mine ? "bg-primary text-white" : "border border-border-subtle bg-white text-heading",
        )}
      >
        {m.announcement && (
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <Megaphone aria-hidden="true" className="size-3.5" />
            {t("announcement")}
          </p>
        )}
        {mine && <span className="sr-only">{t("youSaid")} </span>}
        {m.body}
        {m.attachments.length > 0 && (
          <ul className={cn("flex flex-col gap-1.5", m.body && "mt-2")}>
            {m.attachments.map((f) => (
              <li key={f.id}>
                {f.url ? (
                  <a
                    href={f.url}
                    download={f.name}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm underline-offset-4 hover:underline",
                      mine && !m.announcement ? "bg-ink/30 text-white" : "bg-surface-1 text-heading",
                    )}
                  >
                    <FileText aria-hidden="true" className="size-4 shrink-0" />
                    {/* Named by its visible text (WCAG 2.5.3): "Download <file> <size>". */}
                    <span className="sr-only">{t("download")} </span>
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0">{formatBytes(f.size_bytes)}</span>
                    <Download aria-hidden="true" className="size-4 shrink-0" />
                  </a>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    {t("scanning", { name: f.name })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
      {m.filtered && !m.removed && (
        <p className="mt-0.5 flex items-center gap-1 px-1 text-xs">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          {t("filtered")}
        </p>
      )}
      {seen && (
        <p className="mt-0.5 flex items-center gap-1 px-1 text-xs">
          <CheckCheck aria-hidden="true" className="size-3.5 text-primary" />
          {t("seen")}
        </p>
      )}
    </li>
  );
}

/** MSG-6: the conversation is closed while one side has blocked the other. */
function BlockedFooter({ c }: { c: Conversation }) {
  const t = useTranslations("inbox.safety");
  const block = useBlockConversation(c.id);
  const name = c.participants[0]?.name ?? c.title;
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle bg-white px-4 py-4 text-[15px]">
      <Ban aria-hidden="true" className="size-4 shrink-0" />
      <p className="flex-1">{c.blocked === "BY_ME" ? t("youBlocked", { name }) : t("theyBlocked")}</p>
      {c.blocked === "BY_ME" && (
        <Button
          variant="outline"
          loading={block.isPending}
          onClick={() =>
            block.mutate(false, {
              onSuccess: () => toast.success(t("unblocked", { name })),
              onError: () => toast.error(t("failed")),
            })
          }
        >
          {t("unblock", { name })}
        </Button>
      )}
    </div>
  );
}
