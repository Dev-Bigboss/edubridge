"use client";

import { ArrowLeft, CalendarX, Info, LockKeyhole, SearchX, XCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FormError } from "@/components/auth/auth-card";
import { PersonAvatar } from "@/components/catalog/bits";
import { BreakdownLines } from "@/components/checkout/breakdown";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useBookingQuote, useRequestBooking, useSlots } from "@/lib/api/hooks/bookings";
import { useCatalogTraining } from "@/lib/api/hooks/catalog";
import { ONE_ON_ONE_LENGTHS } from "@/lib/api/schemas/bookings";
import type { PublicTrainingDetail } from "@/lib/api/schemas/catalog";
import type { User } from "@/lib/api/schemas/auth";
import { cn } from "@/lib/cn";
import { MODALITY } from "@/lib/domain/enums";
import { formatDuration, formatMoney, formatPriceTag } from "@/lib/domain/money";
import { groupByLocalDay } from "@/lib/domain/slots";
import { formatInZone, formatSessionTime, zoneLabel } from "@/lib/domain/time";

/** /learn/book/[slug] (OTO-2/3/7, PAY-4): instructor, length, a free time in my zone, then authorise. */
export function BookSession({ slug, user }: { slug: string; user: User }) {
  const t = useTranslations("booking");
  const training = useCatalogTraining(slug);
  if (training.isError) {
    return (
      <EmptyState
        icon={SearchX}
        title={t("notFound")}
        description={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href="/trainings">{t("browse")}</Link>
          </Button>
        }
      />
    );
  }
  if (!training.data) return <LoadingState />;
  if (training.data.modality.code !== MODALITY.ONE_ON_ONE) {
    return (
      <EmptyState
        icon={Info}
        title={t("notOneOnOne")}
        description={t("notOneOnOneBody")}
        action={
          <Button asChild>
            <Link href={`/trainings/${slug}#cohorts`}>{t("seeCohorts")}</Link>
          </Button>
        }
      />
    );
  }
  return <Booker training={training.data} zone={user.timezone} />;
}

function Booker({ training, zone }: { training: PublicTrainingDetail; zone: string }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const priced = training.instructors.filter((i) => i.price);
  const instructorId = priced.find((i) => i.id === params.get("instructor"))?.id ?? (priced.length === 1 ? priced[0].id : null);
  const [duration, setDuration] = useState(60);
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const slots = useSlots(training.id, instructorId, duration);
  const quote = useBookingQuote(training.id, instructorId, duration);
  const request = useRequestBooking();
  const days = useMemo(() => groupByLocalDay(slots.data?.slots ?? [], zone), [slots.data, zone]);
  const selectedDay = days.find((d) => d.date === day) ?? days[0];
  const instructor = priced.find((i) => i.id === instructorId);

  const chooseInstructor = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("instructor", id);
    next.delete("cancelled");
    router.replace(`${pathname}?${next}`, { scroll: false });
    setStart(null);
    setDay(null);
  };

  const submit = async () => {
    if (!instructorId || !start) return;
    setError(null);
    try {
      const res = await request.mutateAsync({ training_id: training.id, instructor_id: instructorId, start_utc: start, duration_min: duration, note: note.trim() || null });
      window.location.assign(res.checkout_url);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLOT_TAKEN") setStart(null);
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link href={`/trainings/${training.slug}`} className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {training.title}
      </Link>
      <h1 className="mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 leading-relaxed">{t("intro", { zone, label: zoneLabel(new Date().toISOString(), zone) })}</p>

      {params.get("cancelled") && (
        <p role="status" className="mb-6 flex items-start gap-3 rounded-sm border border-border bg-white px-4 py-3 text-heading">
          <XCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-body" />
          {t("cancelled")}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {priced.length > 1 && (
            <Step n={1} title={t("chooseInstructor")}>
              <div role="radiogroup" aria-label={t("chooseInstructor")} className="grid gap-3 sm:grid-cols-2">
                {priced.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    role="radio"
                    aria-checked={i.id === instructorId}
                    onClick={() => chooseInstructor(i.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-4 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                      i.id === instructorId ? "border-primary bg-surface-2" : "border-border bg-white hover:border-body/50",
                    )}
                  >
                    <PersonAvatar name={i.name} url={i.avatar_url} />
                    <span className="min-w-0">
                      <span className="block font-medium text-heading">{i.name}</span>
                      <span className="block text-sm">{formatPriceTag(i.price!, i.price!.unit)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {instructor ? (
            <>
              <Step n={priced.length > 1 ? 2 : 1} title={t("length")}>
                <div role="radiogroup" aria-label={t("length")} className="flex flex-wrap gap-2">
                  {ONE_ON_ONE_LENGTHS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={duration === d}
                      onClick={() => (setDuration(d), setStart(null))}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-[15px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                        duration === d ? "border-primary bg-surface-2 font-medium text-heading" : "border-border bg-white hover:border-body/50",
                      )}
                    >
                      {formatDuration(d)}
                    </button>
                  ))}
                </div>
              </Step>

              <Step n={priced.length > 1 ? 3 : 2} title={t("when")} busy={slots.isFetching && !!slots.data}>
                {slots.isPending ? (
                  <LoadingState label={t("loadingTimes")} />
                ) : slots.isError ? (
                  <FormError message={t("timesError")} />
                ) : days.length === 0 ? (
                  <EmptyState icon={CalendarX} title={t("noTimes")} description={priced.length > 1 ? t("noTimesOther") : t("noTimesBody")} className="py-8" />
                ) : (
                  <>
                    <div role="radiogroup" aria-label={t("day")} className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2">
                      {days.map((d) => {
                        const active = d.date === selectedDay?.date;
                        const date = new Date(`${d.date}T12:00:00Z`);
                        return (
                          <button
                            key={d.date}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}, ${t("timesCount", { count: d.starts.length })}`}
                            onClick={() => (setDay(d.date), setStart(null))}
                            className={cn(
                              "flex min-w-[76px] shrink-0 flex-col items-center rounded-md border px-3 py-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                              active ? "border-primary bg-primary text-white" : "border-border bg-white text-heading hover:border-body/50",
                            )}
                          >
                            <span className="text-xs uppercase">{date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
                            <span className="font-heading text-lg font-semibold">{date.getUTCDate()}</span>
                            <span className="text-xs">{date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedDay && (
                      <div role="radiogroup" aria-label={t("time")} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {selectedDay.starts.map((s) => (
                          <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={start === s}
                            onClick={() => setStart(s)}
                            className={cn(
                              "min-h-11 rounded-sm border text-[15px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                              start === s ? "border-primary bg-primary font-medium text-white" : "border-border bg-white text-heading hover:border-primary",
                            )}
                          >
                            {formatInZone(s, zone, "HH:mm")}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Step>

              <Step n={priced.length > 1 ? 4 : 3} title={t("noteTitle")}>
                <Field label={t("note")} hint={t("noteHint")}>
                  {(a) => <Textarea {...a} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}
                </Field>
              </Step>
            </>
          ) : (
            <p className="text-heading">{t("pickInstructorFirst")}</p>
          )}
        </div>

        <aside aria-labelledby="summary" className="rounded-md border border-border bg-white p-6 shadow-[0_10px_30px_rgba(8,42,94,0.06)] lg:sticky lg:top-24">
          <h2 id="summary" className="mb-4 text-lg">
            {t("summary")}
          </h2>
          {instructor && (
            <p className="mb-3 flex items-center gap-3 text-heading">
              <PersonAvatar name={instructor.name} url={instructor.avatar_url} size="sm" />
              {instructor.name}
            </p>
          )}
          <p className="mb-4 text-[15px]">{start ? formatSessionTime(start, zone) : t("noTimeYet")}</p>
          {quote.data && <BreakdownLines breakdown={quote.data.breakdown} />}
          <p className="mt-4 flex items-start gap-2 rounded-sm bg-info-soft px-3 py-2.5 text-sm leading-relaxed text-heading">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            {t("hold", { name: instructor?.name ?? t("theInstructor"), hours: quote.data?.expiry_hours ?? 24 })}
          </p>
          <FormError message={error} />
          <Button className="mt-4 w-full" size="lg" disabled={!start || !quote.data} loading={request.isPending} onClick={() => void submit()}>
            {quote.data && start ? t("submit", { total: formatMoney({ amount: quote.data.breakdown.total, currency: quote.data.breakdown.currency }) }) : t("submitIdle")}
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, title, children, busy }: { n: number; title: string; children: React.ReactNode; busy?: boolean }) {
  return (
    <section aria-label={title} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg">
        <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-primary">
          {n}
        </span>
        {title}
        {busy && <Spinner className="size-4 text-primary" />}
      </h2>
      {children}
    </section>
  );
}
