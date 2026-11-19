"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/auth/auth-card";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useSaveSection } from "@/lib/api/hooks/onboarding";
import { z } from "zod";
import { EDUCATION_LEVELS } from "@/lib/domain/enums";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";
import { useStepSubmit } from "./use-step-form";

/** Form shape: the select starts empty and the date box gives "" when cleared. Mapped to the API body on save. */
const BackgroundForm = z.object({
  education_level: z
    .string()
    .refine((v) => (EDUCATION_LEVELS as readonly string[]).includes(v), { error: "Choose the option closest to you." }),
  exam_target_date: z
    .string()
    .refine((v) => !v || v >= new Date().toISOString().slice(0, 10), { error: "Pick today or a later date." }),
});
type Values = z.infer<typeof BackgroundForm>;

/** ONB-2: education level and optional exam date. The last learner step, so it finishes onboarding. */
export function BackgroundStep({ state, onDone, onBack, submitLabel, pending }: StepProps & { submitLabel: string; pending: boolean }) {
  const t = useTranslations("onboarding.background");
  const save = useSaveSection("background");
  const saved = state.sections.background;
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<Values>({
    resolver: zodResolver(BackgroundForm),
    mode: "onTouched",
    defaultValues: { education_level: saved?.education_level ?? "", exam_target_date: saved?.exam_target_date ?? "" },
  });
  const { errors } = form.formState;
  const { onSubmit, formError } = useStepSubmit(
    form,
    (v) => save.mutateAsync({ education_level: v.education_level, exam_target_date: v.exam_target_date || null }),
    onDone,
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field label={t("level")} error={errors.education_level?.message}>
        {(a) => (
          <Select {...a} {...form.register("education_level")}>
            <option value="">{t("choose")}</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`levels.${l}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("examDate")} hint={t("examDateHint")} error={errors.exam_target_date?.message}>
        {(a) => <Input {...a} type="date" min={today} className="md:max-w-[240px]" {...form.register("exam_target_date")} />}
      </Field>
      <StepActions onBack={onBack} pending={save.isPending || pending} submitLabel={submitLabel} />
    </form>
  );
}
