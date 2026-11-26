"use client";

import { ArrowRight, Banknote, CalendarDays, Clock, Inbox } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { useCountdown } from "@/components/booking/booking-detail";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { useTeachBookings } from "@/lib/api/hooks/bookings";
import { useEarnings } from "@/lib/api/hooks/earnings";
import { useSchedule } from "@/lib/api/hooks/sessions";
import type { Booking } from "@/lib/api/schemas/bookings";
import type { ScheduleItem } from "@/lib/api/schemas/sessions";
import { useSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/domain/money";
import { formatInZone, formatTimeRange } from "@/lib/domain/time";

/** /teach (OTO-4, PAY-7): pending requests + countdowns, today's sessions, available earnings. */
export function InstructorDashboard() {
  const t = useTranslations("teach.dashboard");
  const { data: user } = useSession();
  const bookings = useTeachBookings();
  const schedule = useSchedule();
  const earnings = useEarnings();
  const [now] = useState(() => Date.now());

  if (!user) return <LoadingState />;
  const zone = user.timezone;

  // Pending requests needing action, soonest deadline first.
  const pending = (bookings.data?.items ?? [])
    .filter((b) => b.status === "PENDING_INSTRUCTOR" || (b.status === "RESCHEDULE_REQUESTED" && b.reschedule?.requested_by === "LEARNER"))
    .sort((a, b) => (a.expires_at ?? "").localeCompare(b.expires_at ?? ""));

  // Sessions that start or are running today (in the instructor's timezone).
  const today = formatInZone(new Date(now).toISOString(), zone, "yyyy-MM-dd");
  const todaySessions = (schedule.data ?? []).filter(
    (i) => formatInZone(i.start_utc, zone, "yyyy-MM-dd") === today && i.status !== "CANCELLED",
  );

  const available = earnings.data?.balances.available ?? null;
  const pending_cents = earnings.data?.balances.pending ?? null;

  return (
    <div className="space-y-6">
      {/* Earnings balance */}
      <EarningsCard available={available} pending={pending_cents} isError={earnings.isError} onRetry={earnings.refetch} />

      {/* Pending requests */}
      <RequestsCard items={pending} zone={zone} isLoading={bookings.isPending} isError={bookings.isError} onRetry={bookings.refetch} t={t} />

      {/* Today's sessions */}
      <TodayCard items={todaySessions} zone={zone} isLoading={schedule.isPending} isError={schedule.isError} onRetry={schedule.refetch} t={t} />
    </div>
  );
}

function EarningsCard({
  available,
  pending: pendingCents,
  isError,
  onRetry,
}: {
  available: number | null;
  pending: number | null;
  isError: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("teach.dashboard");

  if (isError) return (
    <section aria-label={t("earningsTitle")} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <LoadError onRetry={onRetry} />
    </section>
  );

  return (
    <section aria-labelledby="dash-earnings" className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="dash-earnings" className="flex items-center gap-2 font-heading text-[17px] font-medium text-heading">
          <Banknote aria-hidden="true" className="size-5 text-primary" />
          {t("earningsTitle")}
        </h2>
        <Link
          href="/teach/earnings"
          className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t("earningsCta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <dl className="grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm">{t("available")}</dt>
          <dd className="font-heading text-[32px] leading-tight font-semibold text-heading">
            {available !== null ? formatMoney({ amount: Math.max(0, available), currency: "USD" }) : <span className="animate-pulse">…</span>}
          </dd>
        </div>
        <div>
          <dt className="text-sm">{t("pendingEarnings")}</dt>
          <dd className="font-heading text-2xl leading-tight font-semibold text-heading">
            {pendingCents !== null ? formatMoney({ amount: pendingCents, currency: "USD" }) : <span className="animate-pulse">…</span>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function RequestsCard({
  items,
  zone,
  isLoading,
  isError,
  onRetry,
  t,
}: {
  items: Booking[];
  zone: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  t: ReturnType<typeof useTranslations<"teach.dashboard">>;
}) {
  return (
    <section aria-labelledby="dash-requests">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="dash-requests" className="flex items-center gap-2 font-heading text-[17px] font-medium text-heading">
          <Inbox aria-hidden="true" className="size-5 text-primary" />
          {t("requestsTitle")}
          {items.length > 0 && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 font-heading text-sm font-medium text-warning">{items.length}</span>
          )}
        </h2>
        <Link
          href="/teach/requests"
          className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t("requestsCta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border-subtle bg-white p-4">
          <LoadingState />
        </div>
      ) : isError ? (
        <LoadError onRetry={onRetry} />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-1 px-5 py-4 text-[15px]">{t("requestsEmpty")}</p>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
          {items.slice(0, 5).map((b) => (
            <RequestRow key={b.id} booking={b} zone={zone} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestRow({ booking: b, zone, t }: { booking: Booking; zone: string; t: ReturnType<typeof useTranslations<"teach.dashboard">> }) {
  const countdown = useCountdown(b.expires_at);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-heading">{b.learner.name}</p>
        <p className="text-sm">{b.training.title}</p>
      </div>
      <p className="text-sm">{formatTimeRange(b.start_utc, b.end_utc, zone)}, {formatInZone(b.start_utc, zone, "d MMM")}</p>
      {countdown && (
        <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-sm font-medium text-warning">
          <Clock aria-hidden="true" className="size-3.5" />
          {countdown}
        </span>
      )}
      <Button asChild variant="outline" className="shrink-0 h-9 px-4 text-sm">
        <Link href="/teach/requests" aria-label={t("reviewLabel", { name: b.learner.name })}>
          {t("reviewCta")}
        </Link>
      </Button>
    </li>
  );
}

function TodayCard({
  items,
  zone,
  isLoading,
  isError,
  onRetry,
  t,
}: {
  items: ScheduleItem[];
  zone: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  t: ReturnType<typeof useTranslations<"teach.dashboard">>;
}) {
  return (
    <section aria-labelledby="dash-today">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="dash-today" className="flex items-center gap-2 font-heading text-[17px] font-medium text-heading">
          <CalendarDays aria-hidden="true" className="size-5 text-primary" />
          {t("todayTitle")}
        </h2>
        <Link
          href="/teach/schedule"
          className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t("todayCta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border-subtle bg-white p-4">
          <LoadingState />
        </div>
      ) : isError ? (
        <LoadError onRetry={onRetry} />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-1 px-5 py-4 text-[15px]">{t("todayEmpty")}</p>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
          {items.map((i) => (
            <TodayRow key={i.id} item={i} zone={zone} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TodayRow({ item: i, zone, t }: { item: ScheduleItem; zone: string; t: ReturnType<typeof useTranslations<"teach.dashboard">> }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <p className="w-28 shrink-0 text-sm font-medium text-heading tabular-nums">{formatTimeRange(i.start_utc, i.end_utc, zone)}</p>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-heading">{i.training_title}</p>
        <p className="text-sm">{i.subtitle}</p>
      </div>
      <span className="text-sm text-body">{i.kind === "COHORT" ? t("cohort") : t("oneOnOne")}</span>
      {!i.attendance.taken && i.attendance.total > 0 && (
        <Button asChild variant="outline" className="shrink-0 h-9 px-4 text-sm">
          <Link href={`/teach/sessions/${encodeURIComponent(i.id)}`} aria-label={t("attendanceLabel", { what: i.training_title })}>
            {t("takeAttendance")}
          </Link>
        </Button>
      )}
    </li>
  );
}
