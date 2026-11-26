"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useAdminTrainings, useQuote } from "@/lib/api/hooks/admin-catalog";
import { formatPriceTag } from "@/lib/domain/money";

/** PRC-4 preview: pick a training (and instructor, and date) to see the price and why. */
export function PricePreview() {
  const t = useTranslations("admin.pricing");
  const trainings = useAdminTrainings({});
  const [trainingId, setTrainingId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [date, setDate] = useState("");
  const training = trainings.data?.items.find((x) => x.id === trainingId);
  const quote = useQuote({
    training_id: trainingId || null,
    instructor_id: instructorId || null,
    at: date ? new Date(`${date}T12:00:00`).toISOString() : null,
  });

  return (
    <section aria-labelledby="preview-title" className="rounded-md border border-border bg-white p-6">
      <h2 id="preview-title" className="mb-1 text-section">
        {t("previewTitle")}
      </h2>
      <p className="mb-5 leading-relaxed">{t("previewIntro")}</p>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_200px]">
        <Field label={t("training")}>
          {(a) => (
            <Select
              {...a}
              value={trainingId}
              onChange={(e) => {
                setTrainingId(e.target.value);
                setInstructorId("");
              }}
            >
              <option value="">{t("chooseTraining")}</option>
              {trainings.data?.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("instructor")}>
          {(a) => (
            <Select {...a} value={instructorId} onChange={(e) => setInstructorId(e.target.value)} disabled={!training?.instructors.length}>
              <option value="">{t("noInstructor")}</option>
              {training?.instructors.map((i) => (
                <option key={i.instructor_id} value={i.instructor_id}>
                  {i.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("onDate")}>{(a) => <Input {...a} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      </div>
      <div aria-live="polite" className="mt-5 min-h-[72px] rounded-sm bg-surface-1 px-4 py-3">
        {!trainingId ? (
          <p>{t("previewEmpty")}</p>
        ) : quote.isPending ? (
          <Spinner label={t("calculating")} />
        ) : quote.isError ? (
          <p className="text-danger">{quote.error instanceof ApiError ? quote.error.message : t("previewFailed")}</p>
        ) : (
          <>
            <p className="text-lg font-medium text-heading">{formatPriceTag(quote.data, quote.data.unit)}</p>
            <p className="leading-relaxed">{t(`because.${quote.data.source}`)}</p>
          </>
        )}
      </div>
    </section>
  );
}
