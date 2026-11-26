"use client";

import { CalendarDays, ClipboardCheck, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { joinState } from "@/components/booking/calendar-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/status-badge";
import { useSchedule } from "@/lib/api/hooks/sessions";
import type { ScheduleItem } from "@/lib/api/schemas/sessions";
import { useSession } from "@/lib/auth/session";
import { formatInZone, formatTimeRange } from "@/lib/domain/time";

/**
 * /teach/schedule (OTO-10, COH-4): one list of everything the instructor teaches, cohort classes
 * and 1:1 sessions together, so nothing overlaps unnoticed. Attendance still to take comes first.
 */
export function Schedule() {
  const t = useTranslations("teach.schedule");
  const query = useSchedule();
  const { data: user } = useSession();
  const [now] = useState(() => Date.now());
  if (!user) return <LoadingState />;
  const zone = user.timezone;
  const items = query.data ?? [];
  const todo = items.filter((i) => Date.parse(i.start_utc) <= now && i.status === "SCHEDULED" && !i.attendance.taken && i.attendance.total > 0);
  const ahead = items.filter((i) => Date.parse(i.end_utc) > now && i.status !== "CANCELLED" && !todo.includes(i));
  const days = new Map<string, ScheduleItem[]>();
  for (const i of ahead) {
    const d = formatInZone(i.start_utc, zone, "yyyy-MM-dd");
    days.set(d, [...(days.get(d) ?? []), i]);
  }
  const today = formatInZone(new Date(now).toISOString(), zone, "yyyy-MM-dd");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro", { zone })} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : todo.length === 0 && ahead.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("empty")} description={t("emptyBody")} />
      ) : (
        <>
          {todo.length > 0 && (
            <section aria-labelledby="todo" className="mb-8 rounded-md border border-warning/30 bg-warning-soft p-5">
              <h2 id="todo" className="mb-3 flex items-center gap-2 text-lg">
                <ClipboardCheck aria-hidden="true" className="size-5" />
                {t("needsAttendance", { count: todo.length })}
              </h2>
              <ul className="divide-y divide-warning/20">
                {todo.map((i) => (
                  <Row key={i.id} item={i} zone={zone} showDate />
                ))}
              </ul>
            </section>
          )}
          {[...days.entries()].map(([date, list]) => (
            <section key={date} aria-labelledby={`day-${date}`} className="mb-6">
              <h2 id={`day-${date}`} className="mb-2 text-base font-semibold text-heading">
                {date === today ? t("today") : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
              </h2>
              <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
                {list.map((i) => (
                  <Row key={i.id} item={i} zone={zone} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function Row({ item: i, zone, showDate }: { item: ScheduleItem; zone: string; showDate?: boolean }) {
  const t = useTranslations("teach.schedule");
  const join = joinState({ start_utc: i.start_utc, end_utc: i.end_utc, meeting_url: i.join_url });
  const started = join === "OPEN" || join === "ENDED";
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <p className="w-32 shrink-0 font-heading text-[15px] font-medium text-heading">
        {showDate && <span className="block text-sm font-normal text-body">{formatInZone(i.start_utc, zone, "EEE d MMM")}</span>}
        {formatTimeRange(i.start_utc, i.end_utc, zone)}
      </p>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-heading">{i.training_title}</span>
          <Badge tone={i.kind === "COHORT" ? "info" : "neutral"}>{i.kind === "COHORT" ? t("cohort") : t("oneOnOne")}</Badge>
        </p>
        <p className="text-sm">
          {i.subtitle}
          {i.kind === "COHORT" && ` · ${t("learners", { count: i.attendance.total })}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {join === "OPEN" && (
          <Button asChild>
            <a href={i.join_url!} target="_blank" rel="noreferrer" aria-label={t("joinLabel", { what: i.training_title, who: i.subtitle })}>
              <Video aria-hidden="true" className="size-4" />
              {t("join")}
            </a>
          </Button>
        )}
        {started && i.attendance.total > 0 && (
          <Button asChild variant="outline">
            <Link
              href={`/teach/sessions/${encodeURIComponent(i.id)}`}
              aria-label={t("attendanceLabel", {
                action: i.attendance.taken ? t("attendanceTaken", { present: i.attendance.present, total: i.attendance.total }) : t("takeAttendance"),
                what: i.training_title,
                who: i.subtitle,
              })}
            >
              {i.attendance.taken ? t("attendanceTaken", { present: i.attendance.present, total: i.attendance.total }) : t("takeAttendance")}
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
