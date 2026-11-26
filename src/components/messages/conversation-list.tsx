"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PersonAvatar } from "@/components/catalog/bits";
import type { Conversation } from "@/lib/api/schemas/messages";
import { cn } from "@/lib/cn";
import { formatInZone } from "@/lib/domain/time";

/** Time on a list row: the clock today, the date otherwise. */
export function shortWhen(iso: string, zone: string, now = new Date()): string {
  const day = (d: string) => formatInZone(d, zone, "yyyy-MM-dd");
  return day(iso) === day(now.toISOString()) ? formatInZone(iso, zone, "HH:mm") : formatInZone(iso, zone, "d MMM");
}

export function ConversationAvatar({ c }: { c: Conversation }) {
  if (c.kind === "COHORT") {
    return (
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-primary">
        <Users className="size-5" />
      </span>
    );
  }
  const other = c.participants[0];
  return <PersonAvatar name={other?.name ?? c.title} url={other?.avatar_url ?? null} />;
}

/** MSG-3: my conversations with unread counts; the open one is marked as the current page. */
export function ConversationList({ items, selected, base, zone }: { items: Conversation[]; selected: string | null; base: string; zone: string }) {
  const t = useTranslations("inbox");
  return (
    <ul className="divide-y divide-border-subtle">
      {items.map((c) => {
        const active = c.id === selected;
        const unread = c.unread_count > 0;
        return (
          <li key={c.id}>
            <Link
              href={`${base}?c=${c.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 gap-3 px-4 py-3 transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                active ? "bg-surface-2" : "hover:bg-surface-1",
              )}
            >
              <ConversationAvatar c={c} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate font-heading text-[15px] text-heading", unread ? "font-semibold" : "font-medium")}>{c.title}</span>
                  {c.last_message && <span className="shrink-0 text-xs">{shortWhen(c.last_message.created_at, zone)}</span>}
                </span>
                <span className="block truncate text-sm">{c.kind === "COHORT" ? t("cohortSubtitle", { training: c.subtitle, count: c.member_count }) : c.subtitle}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", unread ? "font-medium text-heading" : "text-body")}>
                    {c.last_message
                      ? `${c.last_message.mine ? t("you") : c.kind === "COHORT" ? `${c.last_message.sender_name.split(" ")[0]}: ` : ""}${c.last_message.preview}`
                      : t("noMessagesYet")}
                  </span>
                  {unread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                      {c.unread_count}
                      <span className="sr-only"> {t("unread")}</span>
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
