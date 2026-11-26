"use client";

import { Bell, BellOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Popover } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMarkRead, useNotifications, useUnreadCount } from "@/lib/api/hooks/notifications";
import type { Notification } from "@/lib/api/schemas/notifications";
import { NotificationItem } from "./notification-item";

/** Header bell for every signed-in area (NTF-1): unread count, the latest five, a link to all. */
export function NotificationBell({ base }: { base: "/learn" | "/teach" | "/admin" }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const count = useUnreadCount();
  const unread = count.data ?? 0;
  const recent = useNotifications({ limit: 5 });
  const markRead = useMarkRead();
  const items = recent.data?.pages[0]?.items ?? [];

  const openItem = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? t("bellUnread", { count: unread }) : t("bell")}>
          <Bell aria-hidden="true" className="size-[22px]" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-none font-semibold text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("title")}
          className="z-50 w-[min(380px,calc(100vw-24px))] rounded-md border border-border-subtle bg-white shadow-[0_10px_30px_rgba(8,42,94,0.12)] focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2">
            <p className="font-heading font-semibold text-heading">{t("title")}</p>
            {unread > 0 && (
              <Button variant="link" className="text-sm" onClick={() => markRead.mutate("all")} disabled={markRead.isPending}>
                {t("markAll")}
              </Button>
            )}
          </div>
          <div className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
            {recent.isPending ? (
              <div className="flex justify-center py-8">
                <Spinner className="text-primary" label={t("loading")} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <BellOff aria-hidden="true" className="mb-2 size-6 text-body" />
                <p className="font-medium text-heading">{t("emptyShort")}</p>
                <p className="text-sm leading-relaxed">{t("emptyShortBody")}</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem n={n} onOpen={openItem} compact />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border-subtle p-1.5">
            <Link
              href={`${base}/notifications`}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-sm font-medium text-primary hover:bg-surface-1"
            >
              {t("seeAll")}
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
