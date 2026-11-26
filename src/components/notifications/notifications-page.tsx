"use client";

import { BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useMarkRead, useNotifications } from "@/lib/api/hooks/notifications";
import type { Notification } from "@/lib/api/schemas/notifications";
import { cn } from "@/lib/cn";
import { NotificationItem } from "./notification-item";

/** <area>/notifications (NTF-1): everything, or just unread, with mark-all and paging. */
export function NotificationsPage() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotifications({ unreadOnly });
  const markRead = useMarkRead();
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = query.data?.pages[0]?.unread_count ?? 0;

  const open = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        actions={
          <Button variant="outline" onClick={() => markRead.mutate("all")} disabled={unread === 0} loading={markRead.isPending && markRead.variables === "all"}>
            {t("markAll")}
          </Button>
        }
      />

      <div role="group" aria-label={t("show")} className="mb-4 inline-flex rounded-sm border border-border bg-white p-1">
        {[false, true].map((only) => (
          <button
            key={String(only)}
            type="button"
            aria-pressed={unreadOnly === only}
            onClick={() => setUnreadOnly(only)}
            className={cn(
              "min-h-10 rounded-[4px] px-4 font-heading text-[15px] font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-primary",
              unreadOnly === only ? "bg-primary text-white" : "text-heading hover:bg-surface-1",
            )}
          >
            {only ? t("unreadTab", { count: unread }) : t("allTab")}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={unreadOnly ? t("emptyUnread") : t("empty")}
          description={unreadOnly ? t("emptyUnreadBody") : t("emptyBody")}
          action={
            unreadOnly ? (
              <Button variant="outline" onClick={() => setUnreadOnly(false)}>
                {t("allTab")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white p-1.5">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationItem n={n} onOpen={open} />
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>
                {t("more")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
