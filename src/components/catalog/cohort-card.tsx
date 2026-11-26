"use client";

import { CalendarDays, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicCohort } from "@/lib/api/schemas/catalog";
import { canEnrol } from "@/lib/domain/cohort-machine";
import { formatCalendarDate, formatWeekdays, scheduleInZone, seatsLeft } from "@/lib/domain/cohort-schedule";
import { formatPriceTag } from "@/lib/domain/money";
import { formatSessionTime } from "@/lib/domain/time";
import { cn } from "@/lib/cn";

/**
 * One cohort a learner can pick (COH-1/2). Times are converted to the viewer's zone with the zone
 * named. Enrolment is blocked when full, closed or past the deadline, and the card says which.
 */
export function CohortCard({ cohort, zone, now = new Date() }: { cohort: PublicCohort; zone: string; now?: Date }) {
  const t = useTranslations("catalog.cohort");
  const local = scheduleInZone(cohort.schedule, cohort.first_session_at, zone);
  const left = seatsLeft(cohort);
  const check = canEnrol(
    {
      status: cohort.status,
      capacity: cohort.capacity,
      enrolledCount: cohort.enrolled_count,
      enrolmentDeadlineUtc: cohort.enrolment_deadline,
    },
    now,
  );
  const filled = Math.min(100, Math.round((cohort.enrolled_count / cohort.capacity) * 100));
  const nameId = `cohort-${cohort.id}`;

  return (
    <article aria-labelledby={nameId} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={nameId} className="text-lg">
            {cohort.name}
          </h3>
          <p className="text-sm">{t("with", { name: cohort.instructor.name })}</p>
        </div>
        <StatusBadge status={check.ok ? "OPEN" : check.reason === "FULL" ? "FULL" : cohort.status === "IN_PROGRESS" ? "IN_PROGRESS" : "CLOSED"} />
      </div>

      <dl className="mb-5 grid gap-3 text-[15px] sm:grid-cols-2">
        <Fact icon={CalendarDays} label={t("dates")}>
          {t("dateRange", { start: formatCalendarDate(cohort.start_date), end: formatCalendarDate(cohort.end_date) })}
        </Fact>
        <Fact icon={Clock} label={t("schedule")}>
          {formatWeekdays(local.weekdays)}, {local.start}–{local.end} {local.zone}
          <span className="block text-sm">{t("sessions", { count: cohort.session_count })}</span>
        </Fact>
        <Fact icon={Users} label={t("seats")}>
          {left > 0 ? t("seatsLeft", { left, capacity: cohort.capacity }) : t("noSeats")}
          <span
            aria-hidden="true"
            className="mt-1.5 block h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-surface-2"
          >
            <span className={cn("block h-full rounded-full", left === 0 ? "bg-warning" : "bg-primary")} style={{ width: `${filled}%` }} />
          </span>
        </Fact>
        <Fact icon={CalendarDays} label={t("firstSession")}>
          {formatSessionTime(cohort.first_session_at, zone)}
        </Fact>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <div>
          {cohort.price && <p className="font-heading text-xl font-semibold text-heading">{formatPriceTag(cohort.price, cohort.price.unit)}</p>}
          <p className="text-sm">
            {check.ok || check.reason !== "DEADLINE_PASSED"
              ? t("deadline", { when: formatSessionTime(cohort.enrolment_deadline, zone) })
              : t("deadlinePassed")}
          </p>
        </div>
        {check.ok ? (
          <Button asChild>
            <Link href={`/checkout/cohort/${cohort.id}`} aria-describedby={nameId}>
              {t("enrol")}
            </Link>
          </Button>
        ) : (
          <p className="text-sm font-medium text-heading">{t(`blocked.${check.reason}`)}</p>
        )}
      </div>
    </article>
  );
}

/** dt and dd stay direct children of the group div, as a description list requires. */
function Fact({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-[30px]">
      <dt className="text-sm">
        <Icon aria-hidden="true" className="absolute top-1 left-0 size-[18px] text-primary" />
        {label}
      </dt>
      <dd className="text-heading">{children}</dd>
    </div>
  );
}
