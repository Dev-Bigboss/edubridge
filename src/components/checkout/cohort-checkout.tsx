"use client";

import { CalendarDays, Clock, LockKeyhole, SearchX, User, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useCohortCheckout, useStartCheckout } from "@/lib/api/hooks/checkout";
import type { User as SessionUser } from "@/lib/api/schemas/auth";
import type { CohortCheckout as Checkout } from "@/lib/api/schemas/payments";
import { formatCalendarDate, formatWeekdays, scheduleInZone } from "@/lib/domain/cohort-schedule";
import { formatMoney } from "@/lib/domain/money";
import { formatSessionTime } from "@/lib/domain/time";
import { BreakdownLines } from "./breakdown";

/**
 * /checkout/cohort/[id] (PRC-7, PAY-1/2). Shows exactly what is being bought and the API's
 * breakdown, then hands over to the gateway's hosted page. Card details never touch this app.
 */
export function CohortCheckout({ cohortId, user }: { cohortId: string; user: SessionUser }) {
  const t = useTranslations("checkout");
  const query = useCohortCheckout(cohortId);

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="w-full max-w-xl">
        <EmptyState
          icon={SearchX}
          title={missing ? t("notFound") : t("loadError")}
          description={missing ? t("notFoundBody") : t("loadErrorBody")}
          action={
            missing ? (
              <Button asChild>
                <Link href="/trainings">{t("browse")}</Link>
              </Button>
            ) : (
              <Button onClick={() => void query.refetch()}>{t("retry")}</Button>
            )
          }
        />
      </div>
    );
  }
  if (!query.data) return <LoadingState label={t("loading")} />;
  return <Summary data={query.data} zone={user.timezone} />;
}

function Summary({ data, zone }: { data: Checkout; zone: string }) {
  const t = useTranslations("checkout");
  const params = useSearchParams();
  const start = useStartCheckout();
  const [error, setError] = useState<string | null>(null);
  const { cohort, training, breakdown, blocked } = data;
  const local = scheduleInZone(cohort.schedule, cohort.first_session_at, zone);

  const pay = async () => {
    setError(null);
    try {
      const { checkout_url } = await start.mutateAsync(cohort.id);
      window.location.assign(checkout_url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("startError"));
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <h1 className="mb-2 text-[28px] md:text-page">{t("title")}</h1>
      <p className="mb-8 leading-relaxed">{t("intro")}</p>

      {params.get("cancelled") && (
        <p role="status" className="mb-6 flex items-start gap-3 rounded-sm border border-border bg-white px-4 py-3 text-heading">
          <XCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-body" />
          {t("cancelled")}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_360px] md:items-start">
        <section aria-labelledby="what" className="rounded-md border border-border bg-white p-6 md:p-8">
          <p className="mb-1 text-sm font-medium text-primary">{training.category.name}</p>
          <h2 id="what" className="mb-1 text-section">
            {training.title}
          </h2>
          <p className="mb-6">{cohort.name}</p>
          <dl className="space-y-4 text-[15px]">
            <Row icon={CalendarDays} label={t("dates")}>
              {t("dateRange", { start: formatCalendarDate(cohort.start_date), end: formatCalendarDate(cohort.end_date) })}
            </Row>
            <Row icon={Clock} label={t("schedule")}>
              {formatWeekdays(local.weekdays)}, {local.start}–{local.end} {local.zone}
              <span className="block text-sm text-body">
                {t("sessions", { count: cohort.session_count })} · {t("firstClass", { when: formatSessionTime(cohort.first_session_at, zone) })}
              </span>
            </Row>
            <Row icon={User} label={t("instructor")}>
              {cohort.instructor.name}
            </Row>
          </dl>
          <Link href={`/trainings/${training.slug}`} className="mt-6 inline-flex min-h-11 items-center text-[15px] font-medium text-primary underline-offset-4 hover:underline">
            {t("back")}
          </Link>
        </section>

        <section aria-labelledby="order" className="rounded-md border border-border bg-white p-6 shadow-[0_10px_30px_rgba(8,42,94,0.06)]">
          <h2 id="order" className="mb-4 text-lg">
            {t("order")}
          </h2>
          {blocked ? (
            <div className="space-y-4">
              <p role="alert" className="rounded-sm bg-warning-soft px-4 py-3 leading-relaxed text-heading">
                {t(`blocked.${blocked}`)}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={blocked === "ALREADY_ENROLLED" ? "/learn" : `/trainings/${training.slug}#cohorts`}>
                  {blocked === "ALREADY_ENROLLED" ? t("goToDashboard") : t("otherCohorts")}
                </Link>
              </Button>
            </div>
          ) : (
            breakdown && (
              <div className="space-y-5">
                <BreakdownLines breakdown={breakdown} />
                <FormError message={error} />
                <Button className="w-full" size="lg" loading={start.isPending} onClick={() => void pay()}>
                  <LockKeyhole aria-hidden="true" className="size-4" />
                  {t("pay", { total: formatMoney({ amount: breakdown.total, currency: breakdown.currency }) })}
                </Button>
                <p className="text-sm leading-relaxed">{t("secureNote")}</p>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-8">
      <dt className="text-sm">
        <Icon aria-hidden="true" className="absolute top-0.5 left-0 size-5 text-primary" />
        {label}
      </dt>
      <dd className="text-heading">{children}</dd>
    </div>
  );
}
