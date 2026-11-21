"use client";

import { ArrowLeft, CalendarX, ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useCatalogTraining } from "@/lib/api/hooks/catalog";
import type { PublicTrainingDetail } from "@/lib/api/schemas/catalog";
import { useSession } from "@/lib/auth/session";
import { MODALITY } from "@/lib/domain/enums";
import { formatMoney, formatPriceTag } from "@/lib/domain/money";
import { browserTimeZone } from "@/lib/domain/time";
import { languageName } from "@/lib/domain/training";
import { PersonAvatar, TrainingImage } from "./bits";
import { CohortCard } from "./cohort-card";
import { MessageButton } from "@/components/messages/message-button";

/** /trainings/[slug]: what it is, who teaches it, and the ways to join (TRN-1/4, COH-2, PRC-7). */
export function TrainingDetail({ slug }: { slug: string }) {
  const t = useTranslations("catalog");
  const query = useCatalogTraining(slug);

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="container-site pt-36 pb-20 md:pt-44">
        <EmptyState
          icon={SearchX}
          title={missing ? t("detail.notFound") : t("error")}
          description={missing ? t("detail.notFoundBody") : t("errorBody")}
          action={
            missing ? (
              <Button asChild>
                <Link href="/trainings">{t("detail.browse")}</Link>
              </Button>
            ) : (
              <Button onClick={() => void query.refetch()}>{t("retry")}</Button>
            )
          }
        />
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="pt-32">
        <LoadingState label={t("loading")} />
      </div>
    );
  }
  return <Detail training={query.data} />;
}

function Detail({ training }: { training: PublicTrainingDetail }) {
  const t = useTranslations("catalog");
  const ti = useTranslations("inbox");
  const { data: user } = useSession();
  const zone = useMemo(() => user?.timezone ?? browserTimeZone(), [user?.timezone]);
  const isCohort = training.modality.code === MODALITY.COHORT;
  const openCohorts = training.cohorts.filter((c) => c.status === "OPEN").length;

  // Links such as /trainings/x#cohorts arrive before the sections exist; scroll once they render.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  const facts = [
    { label: t("detail.format"), value: training.modality.name },
    { label: t("detail.level"), value: t(`levels.${training.level}`) },
    { label: t("detail.language"), value: languageName(training.language) },
    ...(training.duration_hours ? [{ label: t("detail.duration"), value: t("card.hours", { count: training.duration_hours }) }] : []),
    ...training.details.map((d) => ({ label: d.label, value: Array.isArray(d.value) ? d.value.join(", ") : d.value })),
  ];

  return (
    <>
      {/* React 19 hoists this into <head>, so the tab shows the training's name. */}
      <title>{`${training.title} | EduBridge`}</title>
      <section className="bg-surface-1 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="container-site grid items-center gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <nav aria-label={t("detail.breadcrumb")} className="mb-5">
              <ol className="flex flex-wrap items-center gap-1 text-sm">
                <li>
                  <Link href="/trainings" className="inline-flex min-h-11 items-center gap-1 hover:text-primary">
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    {t("title")}
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-4" />
                </li>
                <li>
                  <Link href={`/trainings?category=${training.category.slug}`} className="inline-flex min-h-11 items-center hover:text-primary">
                    {training.category.name}
                  </Link>
                </li>
              </ol>
            </nav>
            <h1 className="mb-4 text-[32px] leading-tight md:text-page">{training.title}</h1>
            <p className="mb-6 max-w-2xl text-lg leading-relaxed">{training.summary}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              {training.from_price && (
                <p>
                  <span className="text-sm">{t("card.from")} </span>
                  <span className="font-heading text-2xl font-semibold text-heading">{formatMoney(training.from_price)}</span>
                  <span> {t(`units.${training.from_price.unit}`)}</span>
                </p>
              )}
              <Button asChild size="lg">
                <a href={isCohort ? "#cohorts" : "#instructors"}>{isCohort ? t("detail.chooseCohort") : t("detail.chooseInstructor")}</a>
              </Button>
            </div>
          </div>
          <TrainingImage training={training} priority className="hidden lg:flex" />
        </div>
      </section>

      <div className="container-site grid gap-12 py-12 lg:grid-cols-[1fr_340px] lg:py-16">
        <div className="min-w-0">
          <section aria-labelledby="about" className="mb-12">
            <h2 id="about" className="mb-4 text-section">
              {t("detail.about")}
            </h2>
            <p className="max-w-[68ch] leading-relaxed whitespace-pre-line">{training.description}</p>
          </section>

          {isCohort ? (
            <section id="cohorts" aria-labelledby="cohorts-heading" className="mb-12 scroll-mt-28">
              <h2 id="cohorts-heading" className="mb-1 text-section">
                {t("detail.cohorts")}
              </h2>
              <p className="mb-5 text-sm">{t("detail.timesIn", { zone })}</p>
              {training.cohorts.length === 0 ? (
                <EmptyState
                  icon={CalendarX}
                  title={t("detail.noCohorts")}
                  description={t("detail.noCohortsBody")}
                  action={
                    <Button asChild variant="outline">
                      <Link href={`/trainings?category=${training.category.slug}`}>{t("detail.similar")}</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  {openCohorts === 0 && <p className="mb-4 rounded-sm bg-warning-soft px-4 py-3 text-heading">{t("detail.noneOpen")}</p>}
                  <ul className="flex flex-col gap-4">
                    {training.cohorts.map((c) => (
                      <li key={c.id}>
                        <CohortCard cohort={c} zone={zone} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          ) : null}

          <section id="instructors" aria-labelledby="instructors-heading" className="scroll-mt-28">
            <h2 id="instructors-heading" className="mb-5 text-section">
              {isCohort ? t("detail.instructors") : t("detail.chooseInstructor")}
            </h2>
            <ul className="flex flex-col gap-4">
              {training.instructors.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border-subtle bg-white p-5">
                  <PersonAvatar name={i.name} url={i.avatar_url} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg">{i.name}</h3>
                    {i.headline && <p className="text-[15px]">{i.headline}</p>}
                  </div>
                  {/* MSG-1: a pre-sale question. Guests sign in first and come back here. */}
                  {(!user || user.role === "LEARNER") && (
                    <div className="w-full sm:w-auto">
                      {user ? (
                        <MessageButton role="LEARNER" userId={i.id} trainingId={training.id} variant="link" ariaLabel={ti("askQuestionLabel", { name: i.name })}>
                          {ti("askQuestion")}
                        </MessageButton>
                      ) : (
                        <Button asChild variant="link">
                          <Link href={`/login?next=${encodeURIComponent(`/trainings/${training.slug}#instructors`)}`} aria-label={ti("askQuestionLabel", { name: i.name })}>
                            {ti("askQuestion")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                  {!isCohort && (
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      {i.price && <p className="font-heading text-lg font-semibold text-heading">{formatPriceTag(i.price, i.price.unit)}</p>}
                      {i.price && (
                        <Button asChild variant="outline">
                          <Link href={`/learn/book/${training.slug}?instructor=${i.id}`} aria-label={t("detail.requestWith", { name: i.name })}>
                            {t("detail.requestSession")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {!isCohort && <p className="mt-4 text-sm">{t("detail.bookingHow")}</p>}
          </section>
        </div>

        <aside aria-labelledby="facts-heading" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-border-subtle bg-white p-6">
            <h2 id="facts-heading" className="mb-4 text-lg">
              {t("detail.facts")}
            </h2>
            <dl className="divide-y divide-border-subtle text-[15px]">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <dt>{f.label}</dt>
                  <dd className="text-right font-medium text-heading">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
