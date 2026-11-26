"use client";

import { Archive, BookOpen, CalendarDays, Clock, FolderOpen, MessageSquareText, Users,
  PlayCircle, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReviewButton } from "@/components/reviews/review-dialog";
import { LoadError } from "@/components/admin/catalog-admin";
import { joinState } from "@/components/booking/calendar-button";
import { EnrolmentChecklist } from "./enrolment-checklist";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useMyEnrolments } from "@/lib/api/hooks/me";
import type { LearnerEnrolment } from "@/lib/api/schemas/payments";
import { useSession } from "@/lib/auth/session";
import { enrolmentPhase, formatCalendarDate, formatWeekdays, nextSession, scheduleInZone, type EnrolmentPhase } from "@/lib/domain/cohort-schedule";
import { formatMoney } from "@/lib/domain/money";
import { browserTimeZone, formatSessionTime } from "@/lib/domain/time";
import { cn } from "@/lib/cn";

const GROUPS: EnrolmentPhase[] = ["IN_PROGRESS", "UPCOMING", "FINISHED", "CANCELLED"];

/** /learn/trainings: everything the learner has joined, grouped by where it is (TRN-7, COH-4). */
export function MyTrainings() {
  const t = useTranslations("learner.trainings");
  const query = useMyEnrolments();
  const { data: user } = useSession();
  const zone = user?.timezone ?? browserTimeZone();
  const now = new Date();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/trainings">{t("browse")}</Link>
            </Button>
          }
        />
      ) : (
        GROUPS.map((group) => {
          const items = query.data.items.filter((i) => enrolmentPhase(i.cohort, now) === group);
          if (items.length === 0) return null;
          return (
            <section key={group} aria-labelledby={`group-${group}`} className="mb-10">
              <h2 id={`group-${group}`} className="mb-4 text-section">
                {t(`groups.${group}`)} <span className="text-base font-normal text-body">({items.length})</span>
              </h2>
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li key={item.enrolment.id}>
                    <EnrolmentCard item={item} zone={zone} now={now} phase={group} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function EnrolmentCard({ item, zone, now, phase }: { item: LearnerEnrolment; zone: string; now: Date; phase: EnrolmentPhase }) {
  const t = useTranslations("learner.trainings");
  const { training, cohort, enrolment } = item;
  const local = scheduleInZone(cohort.schedule, cohort.first_session_at, zone);
  const next = phase === "UPCOMING" || phase === "IN_PROGRESS" ? nextSession(cohort, now) : null;
  const titleId = `enr-${enrolment.id}`;

  return (
    <article aria-labelledby={titleId} className={cn("rounded-lg border border-border-subtle bg-white p-5 md:p-6", phase === "CANCELLED" && "bg-surface-1")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{training.category_name}</p>
          <h3 id={titleId} className="text-lg leading-snug">
            {training.title}
          </h3>
          <p className="text-[15px]">
            {cohort.name} · {t("with", { name: cohort.instructor.name })}
          </p>
        </div>
        {training.status === "ARCHIVED" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 px-3 py-1 text-sm text-heading">
            <Archive aria-hidden="true" className="size-4" />
            {t("archived")}
          </span>
        )}
      </div>

      {(phase === "UPCOMING" || phase === "IN_PROGRESS") && <EnrolmentChecklist item={item} />}

      {phase === "CANCELLED" ? (
        <p className="mb-4 leading-relaxed text-heading">{t("cancelledNote", { amount: formatMoney(enrolment.price) })}</p>
      ) : (
        <dl className="mb-4 grid gap-3 text-[15px] sm:grid-cols-2">
          <div className="relative pl-7">
            <dt className="text-sm">
              <CalendarDays aria-hidden="true" className="absolute top-0.5 left-0 size-[18px] text-primary" />
              {next ? (phase === "IN_PROGRESS" ? t("nextClass") : t("firstClass")) : t("dates")}
            </dt>
            <dd className="text-heading">
              {next ? formatSessionTime(next, zone) : t("dateRange", { start: formatCalendarDate(cohort.start_date), end: formatCalendarDate(cohort.end_date) })}
            </dd>
          </div>
          <div className="relative pl-7">
            <dt className="text-sm">
              <Clock aria-hidden="true" className="absolute top-0.5 left-0 size-[18px] text-primary" />
              {t("schedule")}
            </dt>
            <dd className="text-heading">
              {formatWeekdays(local.weekdays)}, {local.start}–{local.end} {local.zone}
            </dd>
          </div>
        </dl>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4 text-sm">
        <span>
          {t("paid", { amount: formatMoney(enrolment.price), date: formatCalendarDate(enrolment.created_at.slice(0, 10)) })}
        </span>
        <span className="flex flex-wrap items-center gap-x-5">
          {item.next_session && phase !== "FINISHED" && phase !== "CANCELLED" &&
            (joinState({ ...item.next_session, meeting_url: item.next_session.join_url }) === "OPEN" ? (
              <Button asChild>
                <a href={item.next_session.join_url} target="_blank" rel="noreferrer">
                  {t("joinClass")}
                </a>
              </Button>
            ) : (
              <span className="text-heading">{t("joinSoon")}</span>
            ))}
          {phase !== "CANCELLED" && (
            <Link href={`/learn/cohorts/${item.cohort.id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
              <Users aria-hidden="true" className="size-4" />
              {t("cohortPage")}
            </Link>
          )}
          {phase !== "CANCELLED" && (
            <Link href={`/learn/resources?training=${training.id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
              <FolderOpen aria-hidden="true" className="size-4" />
              {t("resources")}
            </Link>
          )}
          {(phase === "IN_PROGRESS" || phase === "FINISHED") && (
            <Link href={`/learn/recordings?training=${training.id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
              <PlayCircle aria-hidden="true" className="size-4" />
              {t("recordings")}
            </Link>
          )}
          {(phase === "IN_PROGRESS" || phase === "FINISHED") && (
            <Link href={`/learn/feedback?training=${training.id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
              <MessageSquareText aria-hidden="true" className="size-4" />
              {t("feedback")}
            </Link>
          )}
          {phase === "FINISHED" && <ReviewButton trainingId={training.id} instructorId={item.cohort.instructor.id} variant="link" />}
          <Link href={`/receipts/${enrolment.payment_id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
            <ReceiptText aria-hidden="true" className="size-4" />
            {t("receipt")}
          </Link>
        </span>
      </div>
    </article>
  );
}
