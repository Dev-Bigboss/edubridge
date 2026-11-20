"use client";

import { CalendarDays, Clock, Languages } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PublicTrainingCard } from "@/lib/api/schemas/catalog";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { MODALITY } from "@/lib/domain/enums";
import { formatMoney } from "@/lib/domain/money";
import { languageName } from "@/lib/domain/training";
import { PersonAvatar, TrainingImage } from "./bits";

/**
 * Catalogue card in the original course-card style: image, category tag, title, a short line
 * of facts, instructor and the "from" price (PRC-7). The whole card is one link.
 */
export function TrainingCard({ training }: { training: PublicTrainingCard }) {
  const t = useTranslations("catalog");
  const isCohort = training.modality.code === MODALITY.COHORT;
  const lead = training.instructors[0];

  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border-subtle bg-white p-4 transition-[box-shadow,border-color] duration-200 hover:border-border hover:shadow-[0_10px_30px_rgba(25,25,25,0.08)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primary">
      <div className="relative mb-4">
        <TrainingImage training={training} />
        <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1 font-heading text-xs font-medium text-heading shadow-sm">
          {training.category.name}
        </span>
      </div>

      <p className="mb-1 text-sm font-medium text-primary">
        {isCohort ? t("format.cohort") : training.modality.code === MODALITY.ONE_ON_ONE ? t("format.oneOnOne") : training.modality.name}
        <span aria-hidden="true"> · </span>
        {t(`levels.${training.level}`)}
      </p>
      <h3 className="mb-2 text-lg leading-snug">
        <Link
          href={`/trainings/${training.slug}`}
          className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none group-hover:text-primary"
        >
          {training.title}
        </Link>
      </h3>
      <p className="mb-4 line-clamp-2 text-[15px] leading-relaxed">{training.summary}</p>

      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {training.next_start_date && (
          <li className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4 text-primary" />
            {t("card.starts", { date: formatCalendarDate(training.next_start_date) })}
          </li>
        )}
        {training.duration_hours && (
          <li className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4 text-primary" />
            {t("card.hours", { count: training.duration_hours })}
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <Languages aria-hidden="true" className="size-4 text-primary" />
          {languageName(training.language)}
        </li>
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
        {lead ? (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <PersonAvatar name={lead.name} url={lead.avatar_url} size="sm" />
            <span className="truncate text-heading">
              {lead.name}
              {training.instructors.length > 1 && (
                <span className="text-body"> {t("card.more", { count: training.instructors.length - 1 })}</span>
              )}
            </span>
          </span>
        ) : (
          <span />
        )}
        {training.from_price && (
          <p className="shrink-0 text-right leading-tight">
            <span className="block text-xs">{t("card.from")}</span>
            <span className="font-heading text-lg font-semibold text-heading">{formatMoney(training.from_price)}</span>
            <span className="text-sm"> {t(`units.${training.from_price.unit}`)}</span>
          </p>
        )}
      </div>
    </article>
  );
}
