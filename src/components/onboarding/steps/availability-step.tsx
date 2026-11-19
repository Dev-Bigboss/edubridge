"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/auth/auth-card";
import { WeeklyEditor } from "@/components/availability/weekly-editor";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useSaveSection } from "@/lib/api/hooks/onboarding";
import { AvailabilityInput } from "@/lib/api/schemas/onboarding";
import { timeZoneOptions } from "@/lib/domain/places";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";
import { useStepSubmit } from "./use-step-form";

/** ONB-3 "availability setup". Learners see these hours converted to their own zone (OTO-2). */
export function AvailabilityStep({ state, onDone, onBack }: StepProps) {
  const t = useTranslations("onboarding.availability");
  const save = useSaveSection("availability");
  const zones = useMemo(() => timeZoneOptions(), []);
  const form = useForm<AvailabilityInput>({
    resolver: zodResolver(AvailabilityInput),
    defaultValues: state.sections.availability ?? {
      timezone: state.sections.profile?.timezone ?? "UTC",
      weekly: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "17:00", end: "20:00" })),
    },
  });
  const { errors } = form.formState;
  const { onSubmit, formError } = useStepSubmit(form, (v) => save.mutateAsync(v), onDone);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <p className="leading-relaxed">{t("intro")}</p>
      <Field label={t("timezone")} error={errors.timezone?.message} className="md:max-w-[420px]">
        {(a) => (
          <Select {...a} {...form.register("timezone")}>
            {zones.map((z) => (
              <option key={z.zone} value={z.zone}>
                {z.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <WeeklyEditor control={form.control} register={form.register} errors={errors} />
      {errors.weekly?.root?.message || errors.weekly?.message ? (
        <p role="alert" className="text-sm text-danger">
          {errors.weekly?.root?.message ?? errors.weekly?.message}
        </p>
      ) : null}
      <StepActions onBack={onBack} pending={save.isPending} />
    </form>
  );
}
