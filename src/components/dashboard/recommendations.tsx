"use client";

import { Check, Compass, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LoadError } from "@/components/admin/catalog-admin";
import { TrainingCard } from "@/components/catalog/training-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { useRecommendations } from "@/lib/api/hooks/me";
import type { Recommendation } from "@/lib/api/schemas/recommendations";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";

/** Phase 4: trainings that match the learner's onboarding goals, with the reasons spelled out. */
export function Recommendations() {
  const t = useTranslations("dashboard.recommendations");
  const query = useRecommendations();

  return (
    <section aria-labelledby="recommended" className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="recommended" className="text-section">
            {t("title")}
          </h2>
          {query.data?.profile_complete && <p className="text-[15px] leading-relaxed">{t("intro")}</p>}
        </div>
        {query.data?.profile_complete && (
          <Link href="/onboarding/learner" className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline">
            {t("update")}
          </Link>
        )}
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : !query.data.profile_complete ? (
        <EmptyState
          icon={Compass}
          title={t("noProfileTitle")}
          description={t("noProfileBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/onboarding/learner">{t("noProfileCta")}</Link>
            </Button>
          }
        />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/trainings">{t("browse")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((r) => (
            <li key={r.training.id}>
              <TrainingCard training={r.training} note={<Reasons reasons={r.reasons} />} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Reasons({ reasons }: { reasons: Recommendation["reasons"] }) {
  const t = useTranslations("dashboard.recommendations");
  return (
    <div className="mb-4 rounded-md bg-surface-1 px-3 py-2">
      <p className="sr-only">{t("why")}</p>
      <ul className="space-y-1 text-sm text-heading">
        {reasons.map((r) => (
          <li key={`${r.code}-${r.value}`} className="flex items-start gap-1.5">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            {t(`reasons.${r.code}`, { value: r.code === "BEFORE_EXAM" ? formatCalendarDate(r.value) : (r.value ?? "") })}
          </li>
        ))}
      </ul>
    </div>
  );
}
