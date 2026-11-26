"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, Input } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/spinner";
import { TagInput } from "@/components/ui/tag-input";
import { useCategories } from "@/lib/api/hooks/catalog";
import { useSaveSection } from "@/lib/api/hooks/onboarding";
import { ExpertiseInput } from "@/lib/api/schemas/onboarding";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";
import { useStepSubmit } from "./use-step-form";

type Values = z.input<typeof ExpertiseInput>;

/** ONB-3: what you teach and why learners should trust you. */
export function ExpertiseStep({ state, onDone, onBack }: StepProps) {
  const t = useTranslations("onboarding.expertise");
  const categories = useCategories();
  const save = useSaveSection("expertise");
  const form = useForm<Values>({
    resolver: zodResolver(ExpertiseInput),
    mode: "onTouched",
    defaultValues: state.sections.expertise ?? {
      category_ids: [],
      subjects: [],
      qualifications: [{ title: "", institution: "", year: "" }],
    },
  });
  const quals = useFieldArray({ control: form.control, name: "qualifications" });
  const { errors } = form.formState;
  const { onSubmit, formError } = useStepSubmit(form, (v) => save.mutateAsync(ExpertiseInput.parse(v)), onDone);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />
      {categories.isPending ? (
        <LoadingState />
      ) : (
        <Controller
          control={form.control}
          name="category_ids"
          render={({ field, fieldState }) => (
            <ChoiceChips
              legend={t("categories")}
              options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
      <Controller
        control={form.control}
        name="subjects"
        render={({ field, fieldState }) => (
          <TagInput
            label={t("subjects")}
            hint={t("subjectsHint")}
            placeholder={t("subjectsPlaceholder")}
            max={15}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <fieldset className="space-y-4">
        <legend className="mb-1 font-heading text-[15px] font-medium text-heading">{t("qualifications")}</legend>
        <p className="-mt-2 text-sm leading-relaxed">{t("qualificationsHint")}</p>
        {quals.fields.map((q, i) => (
          <div key={q.id} className="grid gap-3 rounded-sm border border-border p-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-start">
            <Field label={t("qualTitle")} error={errors.qualifications?.[i]?.title?.message}>
              {(a) => <Input {...a} placeholder={t("qualTitlePlaceholder")} {...form.register(`qualifications.${i}.title`)} />}
            </Field>
            <Field label={t("qualInstitution")} error={errors.qualifications?.[i]?.institution?.message}>
              {(a) => <Input {...a} {...form.register(`qualifications.${i}.institution`)} />}
            </Field>
            <Field label={t("qualYear")} error={errors.qualifications?.[i]?.year?.message}>
              {(a) => <Input {...a} inputMode="numeric" maxLength={4} {...form.register(`qualifications.${i}.year`)} />}
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:mt-7"
              aria-label={t("removeQualification", { n: i + 1 })}
              disabled={quals.fields.length === 1}
              onClick={() => quals.remove(i)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ))}
        {errors.qualifications?.root?.message && <p className="text-sm text-danger">{errors.qualifications.root.message}</p>}
        {quals.fields.length < 10 && (
          <Button type="button" variant="outline" onClick={() => quals.append({ title: "", institution: "", year: "" })}>
            <Plus aria-hidden="true" className="size-4" /> {t("addQualification")}
          </Button>
        )}
      </fieldset>
      <StepActions onBack={onBack} pending={save.isPending} />
    </form>
  );
}
