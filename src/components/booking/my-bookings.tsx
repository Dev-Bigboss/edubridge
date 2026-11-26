"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LoadError } from "@/components/admin/catalog-admin";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMyBookings } from "@/lib/api/hooks/bookings";
import type { Booking } from "@/lib/api/schemas/bookings";
import { useSession } from "@/lib/auth/session";
import { isTerminal } from "@/lib/domain/booking-machine";
import { formatDuration } from "@/lib/domain/money";
import { browserTimeZone, formatSessionTime } from "@/lib/domain/time";

/** /learn/bookings: 1:1 sessions, what needs attention first, then upcoming, then past. */
export function MyBookings() {
  const t = useTranslations("booking.list");
  const query = useMyBookings();
  const { data: user } = useSession();
  const zone = user?.timezone ?? browserTimeZone();

  const groups: { key: "active" | "past"; items: Booking[] }[] = query.data
    ? [
        { key: "active", items: query.data.items.filter((b) => !isTerminal(b.status)).sort((a, b) => a.start_utc.localeCompare(b.start_utc)) },
        { key: "past", items: query.data.items.filter((b) => isTerminal(b.status)) },
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/trainings?modality=ONE_ON_ONE">{t("find")}</Link>
            </Button>
          }
        />
      ) : (
        groups.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.key} aria-labelledby={`bk-${g.key}`} className="mb-8">
                <h2 id={`bk-${g.key}`} className="mb-3 text-section">
                  {t(g.key)}
                </h2>
                <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
                  {g.items.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/learn/bookings/${b.id}`}
                        className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                      >
                        <PersonAvatar name={b.instructor.name} url={b.instructor.avatar_url} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-heading">{b.training.title}</span>
                          <span className="block text-sm">
                            {b.instructor.name} · {formatSessionTime(b.start_utc, zone)} · {formatDuration(b.duration_min)}
                          </span>
                        </span>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )
      )}
    </div>
  );
}
