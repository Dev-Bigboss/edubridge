"use client";

import { useTranslations } from "next-intl";
import { useTrainingReviews } from "@/lib/api/hooks/reviews";
import type { TrainingReviews as Data } from "@/lib/api/schemas/reviews";
import { formatInZone } from "@/lib/domain/time";
import { Stars } from "./stars";

/** An instructor's average on this training, next to their name (FDB-4). Nothing until there are enough reviews. */
export function InstructorRating({ data, instructorId }: { data: Data | undefined; instructorId: string }) {
  const t = useTranslations("reviews");
  const row = data?.summary.instructors.find((i) => i.instructor_id === instructorId);
  if (!row?.average) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-heading">
      <Stars value={row.average} size="sm" />
      <span aria-hidden="true">{row.average.toFixed(1)}</span>
      <span>({t("count", { count: row.count })})</span>
    </p>
  );
}

/** FDB-4 on the training page: the average and what learners wrote, newest first. */
export function TrainingReviews({ trainingId, zone }: { trainingId: string; zone: string }) {
  const t = useTranslations("reviews");
  const query = useTrainingReviews(trainingId);
  const data = query.data;
  if (!data) return null;
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-28">
      <h2 id="reviews-heading" className="mb-2 text-section">
        {t("heading")}
      </h2>
      {data.summary.count === 0 ? (
        <p className="text-[15px]">{t("none")}</p>
      ) : (
        <>
          <p className="mb-5 flex flex-wrap items-center gap-2 text-[15px] text-heading">
            {data.summary.training_average ? (
              <>
                <Stars value={data.summary.training_average} />
                <span className="font-heading text-lg font-semibold" aria-hidden="true">
                  {data.summary.training_average.toFixed(1)}
                </span>
                <span>{t("fromCount", { count: data.summary.count })}</span>
              </>
            ) : (
              <span>{t("notEnough", { count: data.summary.count })}</span>
            )}
          </p>
          <ul className="flex flex-col gap-4">
            {data.items.map((r) => (
              <li key={r.id} className="rounded-lg border border-border-subtle bg-white p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Stars value={r.training_rating} size="sm" />
                  <p className="text-sm">
                    {r.author_name} · <time dateTime={r.created_at}>{formatInZone(r.created_at, zone, "MMMM yyyy")}</time>
                    {r.edited && ` · ${t("editedLabel")}`}
                  </p>
                </div>
                <p className="leading-relaxed whitespace-pre-line text-heading">{r.comment}</p>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                  {t("instructorWas", { name: r.instructor.name })} <Stars value={r.instructor_rating} size="sm" />
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
