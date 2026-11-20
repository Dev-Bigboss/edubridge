"use client";

import { ArrowLeft, CalendarX, Clock, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { joinState } from "@/components/booking/calendar-button";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useSaveAttendance, useTeachingSession } from "@/lib/api/hooks/sessions";
import { ATTENDANCE, type Attendance, type SessionDetail } from "@/lib/api/schemas/sessions";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatInZone, formatTimeRange } from "@/lib/domain/time";

/** /teach/sessions/[id] (COH-4): mark who came, from the start of the session. */
export function AttendanceSheet({ id }: { id: string }) {
  const t = useTranslations("teach.attendance");
  const query = useTeachingSession(id);
  const { data: user } = useSession();
  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState
        icon={CalendarX}
        title={t("notFound")}
        description={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href="/teach/schedule">{t("back")}</Link>
          </Button>
        }
      />
    ) : (
      <LoadError onRetry={query.refetch} />
    );
  }
  if (!query.data || !user) return <LoadingState />;
  return <Sheet data={query.data} zone={user.timezone} key={query.data.session.id} />;
}

function Sheet({ data, zone }: { data: SessionDetail; zone: string }) {
  const t = useTranslations("teach.attendance");
  const save = useSaveAttendance(data.session.id);
  const { session: s, roster } = data;
  const [marks, setMarks] = useState<Record<string, Attendance | null>>(() => Object.fromEntries(roster.map((r) => [r.learner_id, r.status])));
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const started = Date.parse(s.start_utc) <= now;
  const join = joinState({ start_utc: s.start_utc, end_utc: s.end_utc, meeting_url: s.join_url });
  const missing = roster.filter((r) => !marks[r.learner_id]).length;

  const submit = async () => {
    setError(null);
    const list = Object.entries(marks).filter((e): e is [string, Attendance] => !!e[1]);
    if (list.length === 0) return setError(t("markSomeone"));
    try {
      await save.mutateAsync({ marks: list.map(([learner_id, status]) => ({ learner_id, status })) });
      toast.success(t("saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/teach/schedule" className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>
      <header className="mb-6">
        <p className="text-sm font-medium text-primary">{s.kind === "COHORT" ? t("cohortClass") : t("oneOnOne")}</p>
        <h1 className="text-[28px] leading-tight">{s.training_title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[15px]">
          <span>{s.subtitle}</span>
          <span className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {formatInZone(s.start_utc, zone, "EEEE d MMMM")}, {formatTimeRange(s.start_utc, s.end_utc, zone)}
          </span>
        </p>
        {join === "OPEN" && (
          <Button asChild className="mt-4">
            <a href={s.join_url!} target="_blank" rel="noreferrer">
              <Video aria-hidden="true" className="size-4" />
              {t("join")}
            </a>
          </Button>
        )}
      </header>

      {!started ? (
        <p role="status" className="rounded-md border border-border bg-surface-1 p-4 text-heading">
          {t("notYet")}
        </p>
      ) : (
        <section aria-labelledby="register" className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="register" className="text-lg">
              {t("register", { count: roster.length })}
            </h2>
            {roster.length > 1 && (
              <Button variant="link" onClick={() => setMarks(Object.fromEntries(roster.map((r) => [r.learner_id, marks[r.learner_id] ?? "PRESENT"])))}>
                {t("restPresent")}
              </Button>
            )}
          </div>
          {s.kind === "ONE_ON_ONE" && <p className="mb-4 text-sm leading-relaxed">{t("oneOnOneNote")}</p>}
          <ul className="divide-y divide-border-subtle">
            {roster.map((r) => (
              <li key={r.learner_id} className="flex flex-wrap items-center gap-3 py-3">
                <PersonAvatar name={r.name} url={null} size="sm" />
                <span className="min-w-0 flex-1 font-medium text-heading">{r.name}</span>
                <div role="radiogroup" aria-label={t("markFor", { name: r.name })} className="inline-flex rounded-sm border border-border p-0.5">
                  {ATTENDANCE.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={marks[r.learner_id] === a}
                      onClick={() => setMarks((m) => ({ ...m, [r.learner_id]: a }))}
                      className={cn(
                        "min-h-10 min-w-[76px] rounded-[4px] px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                        marks[r.learner_id] === a
                          ? a === "ABSENT"
                            ? "bg-danger text-white"
                            : a === "LATE"
                              ? "bg-warning text-white"
                              : "bg-success text-white"
                          : "text-heading hover:bg-surface-1",
                      )}
                    >
                      {t(`marks.${a}`)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <FormError message={error} />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border-subtle pt-4">
            {missing > 0 && <p className="mr-auto text-sm">{t("missing", { count: missing })}</p>}
            <Button loading={save.isPending} onClick={() => void submit()}>
              {t("save")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
