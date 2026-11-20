"use client";

import { ArrowLeft, CalendarX, Clock, LoaderCircle, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { PersonAvatar } from "@/components/catalog/bits";
import { BreakdownLines } from "@/components/checkout/breakdown";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { useBooking } from "@/lib/api/hooks/bookings";
import type { Booking } from "@/lib/api/schemas/bookings";
import type { User } from "@/lib/api/schemas/auth";
import { formatDuration } from "@/lib/domain/money";
import { formatInZone, formatSessionTime, formatTimeRange, minutesUntil, timeAgo } from "@/lib/domain/time";

/** "23 h 10 min", "45 min": how long the other side has left to answer (OTO-5). */
export function useCountdown(iso: string | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) return null;
  const mins = Math.max(0, minutesUntil(iso, now));
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
}

/** /learn/bookings/[id]: where the request stands, what it costs, what happened (OTO-3..7). */
export function BookingDetail({ id, user }: { id: string; user: User }) {
  const t = useTranslations("booking.detail");
  const query = useBooking(id);
  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState
        icon={CalendarX}
        title={t("notFound")}
        description={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href="/learn/bookings">{t("allSessions")}</Link>
          </Button>
        }
      />
    ) : (
      <LoadError onRetry={query.refetch} />
    );
  }
  if (!query.data) return <LoadingState />;
  return <Detail booking={query.data} zone={user.timezone} />;
}

function Detail({ booking: b, zone }: { booking: Booking; zone: string }) {
  const t = useTranslations("booking.detail");
  const countdown = useCountdown(b.status === "PENDING_INSTRUCTOR" ? b.expires_at : null);
  const confirmingCard = b.status === "DRAFT" && b.payment_status === "PENDING";
  const cardFailed = b.status === "DRAFT" && b.payment_status === "FAILED";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/learn/bookings" className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("allSessions")}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">{t("oneOnOne")}</p>
          <h1 className="text-[28px] leading-tight">{b.training.title}</h1>
        </div>
        {!confirmingCard && !cardFailed && <StatusBadge status={b.status} />}
      </header>

      {confirmingCard && (
        <Banner tone="info" icon={<LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" />}>
          {t("confirmingCard")}
        </Banner>
      )}
      {cardFailed && (
        <Banner tone="danger" action={<Button asChild><Link href={`/learn/book/${b.training.slug}?instructor=${b.instructor.id}`}>{t("tryAgain")}</Link></Button>}>
          {t("cardFailed")}
        </Banner>
      )}
      {b.status === "PENDING_INSTRUCTOR" && (
        <Banner tone="info" icon={<Clock aria-hidden="true" className="size-5 shrink-0 text-primary" />}>
          {t("waiting", { name: b.instructor.name, countdown: countdown ?? "", when: b.expires_at ? formatSessionTime(b.expires_at, zone) : "" })}
        </Banner>
      )}
      {b.status === "EXPIRED" && (
        <Banner tone="neutral" action={<Button asChild variant="outline"><Link href={`/learn/book/${b.training.slug}?instructor=${b.instructor.id}`}>{t("bookAgain")}</Link></Button>}>
          {t("expired", { name: b.instructor.name })}
        </Banner>
      )}
      {b.status === "ACCEPTED" && b.meeting_url && (
        <Banner tone="success" icon={<Video aria-hidden="true" className="size-5 shrink-0 text-success" />}>
          {t("confirmed")}
        </Banner>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section aria-labelledby="session" className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
          <h2 id="session" className="mb-4 text-lg">
            {t("session")}
          </h2>
          <dl className="space-y-4 text-[15px]">
            <div>
              <dt className="text-sm">{t("when")}</dt>
              <dd className="text-heading">
                {formatInZone(b.start_utc, zone, "EEEE d MMMM")}, {formatTimeRange(b.start_utc, b.end_utc, zone)}
              </dd>
            </div>
            <div>
              <dt className="text-sm">{t("length")}</dt>
              <dd className="text-heading">{formatDuration(b.duration_min)}</dd>
            </div>
            <div>
              <dt className="text-sm">{t("instructor")}</dt>
              <dd className="mt-1 flex items-center gap-3 text-heading">
                <PersonAvatar name={b.instructor.name} url={b.instructor.avatar_url} size="sm" />
                {b.instructor.name}
              </dd>
            </div>
            {b.note && (
              <div>
                <dt className="text-sm">{t("yourNote")}</dt>
                <dd className="leading-relaxed whitespace-pre-line text-heading">{b.note}</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby="price" className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
          <h2 id="price" className="mb-4 text-lg">
            {t("price")}
          </h2>
          <BreakdownLines breakdown={b.breakdown} />
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {t("card")} <StatusBadge status={b.payment_status} />
          </p>
        </section>
      </div>

      {b.timeline.length > 0 && (
        <section aria-labelledby="history" className="mt-6 rounded-lg border border-border-subtle bg-white p-5 md:p-6">
          <h2 id="history" className="mb-4 text-lg">
            {t("history")}
          </h2>
          <ol className="relative space-y-4 border-l border-border pl-5">
            {[...b.timeline].reverse().map((e, i) => (
              <li key={`${e.at}-${i}`} className="relative">
                <span aria-hidden="true" className="absolute top-2 -left-[25px] size-2.5 rounded-full bg-primary" />
                <p className="text-heading">{t.has(`events.${e.event}`) ? t(`events.${e.event}` as "events.REQUESTED") : e.event}</p>
                {e.note && <p className="text-[15px] leading-relaxed whitespace-pre-line">“{e.note}”</p>}
                <p className="text-sm">
                  <time dateTime={e.at}>{timeAgo(e.at)}</time>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Banner({ tone, icon, action, children }: { tone: "info" | "danger" | "neutral" | "success"; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  const tones = {
    info: "border-primary/25 bg-surface-2",
    danger: "border-danger/30 bg-danger-soft",
    neutral: "border-border bg-surface-1",
    success: "border-success/30 bg-success-soft",
  };
  return (
    <div role="status" className={`mb-6 flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center ${tones[tone]}`}>
      {icon}
      <p className="flex-1 leading-relaxed text-heading">{children}</p>
      {action}
    </div>
  );
}
