"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarX, FolderOpen, Megaphone, MessagesSquare, PlayCircle, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { joinState } from "@/components/booking/calendar-button";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useCohortSpace, useSendMessage } from "@/lib/api/hooks/messages";
import type { CohortSpace } from "@/lib/api/schemas/messages";
import { useSession } from "@/lib/auth/session";
import { MESSAGE_MAX_LENGTH } from "@/lib/domain/messages";
import { browserTimeZone, formatInZone, formatTimeRange } from "@/lib/domain/time";

type Area = "learn" | "teach";
const LINKS: Record<Area, { back: string; messages: string; resources: (t: string) => string; recordings: (t: string) => string }> = {
  learn: { back: "/learn/trainings", messages: "/learn/messages", resources: (t) => `/learn/resources?training=${t}`, recordings: (t) => `/learn/recordings?training=${t}` },
  teach: { back: "/teach/schedule", messages: "/teach/messages", resources: (t) => `/teach/resources?training=${t}`, recordings: () => "/teach/recordings" },
};

/** /learn/cohorts/[id] and /teach/cohorts/[id] (COH-6): who's in the cohort, and the announcements feed. */
export function CohortSpacePage({ id, area }: { id: string; area: Area }) {
  const t = useTranslations("cohortSpace");
  const query = useCohortSpace(id);
  const { data: user } = useSession();
  const zone = user?.timezone ?? browserTimeZone();
  const links = LINKS[area];

  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState
        icon={CalendarX}
        title={t("notFound")}
        description={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href={links.back}>{area === "learn" ? t("backLearn") : t("backTeach")}</Link>
          </Button>
        }
      />
    ) : (
      <LoadError onRetry={query.refetch} />
    );
  }
  if (!query.data) return <LoadingState />;
  const s = query.data;
  const next = s.cohort.next_session;
  const join = next ? joinState({ start_utc: next.start_utc, end_utc: next.end_utc, meeting_url: next.join_url }) : null;
  const day = (d: string) => formatInZone(`${d}T12:00:00Z`, zone, "d MMM yyyy");

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={links.back} className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {area === "learn" ? t("backLearn") : t("backTeach")}
      </Link>
      <header className="mb-6">
        <p className="text-sm font-medium text-primary">{s.cohort.training_title}</p>
        <h1 className="text-[28px] leading-tight">{s.cohort.name}</h1>
        <p className="mt-1 text-[15px]">{t("runs", { from: day(s.cohort.start_date), to: day(s.cohort.end_date) })}</p>
        {next && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-heading">
              {t("nextClass")}: {formatInZone(next.start_utc, zone, "EEEE d MMMM")}, {formatTimeRange(next.start_utc, next.end_utc, zone)}
            </p>
            {join === "OPEN" && (
              <Button asChild>
                <a href={next.join_url} target="_blank" rel="noreferrer">
                  <Video aria-hidden="true" className="size-4" />
                  {t("join")}
                </a>
              </Button>
            )}
          </div>
        )}
        <nav aria-label={t("shortcuts")} className="mt-4 flex flex-wrap gap-x-5">
          <Link href={`${links.messages}?c=${s.channel_id}`} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
            <MessagesSquare aria-hidden="true" className="size-4" />
            {t("channel")}
          </Link>
          <Link href={links.resources(s.cohort.training_id)} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
            <FolderOpen aria-hidden="true" className="size-4" />
            {t("resources")}
          </Link>
          <Link href={links.recordings(s.cohort.training_id)} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
            <PlayCircle aria-hidden="true" className="size-4" />
            {t("recordings")}
          </Link>
        </nav>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="announcements">
          <h2 id="announcements" className="mb-3 text-lg">
            {t("announcements")}
          </h2>
          {s.can_announce && <AnnounceForm space={s} />}
          {s.announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title={t("noAnnouncements")} description={s.can_announce ? t("noAnnouncementsInstructor") : t("noAnnouncementsLearner")} />
          ) : (
            <ol className="space-y-3">
              {s.announcements.map((m) => (
                <li key={m.id}>
                  <article aria-label={t("announcementFrom", { name: m.sender.name, date: formatInZone(m.created_at, zone, "d MMM") })} className="rounded-lg border border-accent/50 bg-white p-5">
                    <p className="mb-2 flex flex-wrap items-center gap-x-2 text-sm">
                      <Megaphone aria-hidden="true" className="size-4 text-heading" />
                      <span className="font-semibold text-heading">{m.sender.name}</span>
                      <time dateTime={m.created_at}>{formatInZone(m.created_at, zone, "EEE d MMM, HH:mm")}</time>
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap text-heading">{m.body}</p>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="roster">
          <h2 id="roster" className="mb-3 text-lg">
            {t("roster", { count: s.learners.length + 1 })}
          </h2>
          <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
            <li className="flex items-center gap-3 px-4 py-3">
              <PersonAvatar name={s.instructor.name} url={s.instructor.avatar_url} size="sm" />
              <span className="min-w-0 flex-1 font-medium text-heading">{s.instructor.name}</span>
              <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-primary">{t("instructor")}</span>
            </li>
            {s.learners.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <PersonAvatar name={p.name} url={p.avatar_url} size="sm" />
                <span className="min-w-0 flex-1 text-heading">
                  {p.name}
                  {p.id === user?.id && <span className="text-sm text-body"> ({t("you")})</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm leading-relaxed">{t("rosterPrivacy")}</p>
        </section>
      </div>
    </div>
  );
}

/** The instructor posts straight into the cohort channel as an announcement. */
function AnnounceForm({ space }: { space: CohortSpace }) {
  const t = useTranslations("cohortSpace");
  const id = useId();
  const qc = useQueryClient();
  const send = useSendMessage(space.channel_id);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());

  const submit = () => {
    if (text.trim().length < 2) return setError(t("tooShort"));
    setError(null);
    send.mutate(
      { body: text.trim(), attachment_ids: [], announcement: true, client_id: clientId },
      {
        onSuccess: () => {
          setText("");
          setClientId(crypto.randomUUID());
          void qc.invalidateQueries({ queryKey: ["cohort-space", space.cohort.id] });
          toast.success(t("posted"));
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : t("failed")),
      },
    );
  };

  return (
    <form
      noValidate
      className="mb-4 rounded-lg border border-border-subtle bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={`${id}-text`} className="mb-1.5 block font-heading text-[15px] font-medium text-heading">
        {t("newAnnouncement")}
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        maxLength={MESSAGE_MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
        className="block min-h-[96px] w-full rounded-sm border border-border bg-white px-3 py-2.5 text-[16px] leading-relaxed text-heading hover:border-body/50 focus:border-primary focus:outline-2 focus:outline-primary/25 aria-invalid:border-danger"
      />
      <p id={`${id}-hint`} className="mt-1 text-sm">
        {t("announceHint", { count: space.learners.length })}
      </p>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="submit" loading={send.isPending}>
          <Megaphone aria-hidden="true" className="size-4" />
          {t("post")}
        </Button>
      </div>
    </form>
  );
}
