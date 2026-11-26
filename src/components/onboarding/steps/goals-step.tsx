"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { FormError } from "@/components/auth/auth-card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { TagInput } from "@/components/ui/tag-input";
import { useCategories } from "@/lib/api/hooks/catalog";
import { useSaveSection } from "@/lib/api/hooks/onboarding";
import { GoalsInput } from "@/lib/api/schemas/onboarding";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";
import { useStepSubmit } from "./use-step-form";

/** ONB-2: goals and interests. These feed recommendations later (Phase 4). */
export function GoalsStep({ state, onDone, onBack, onLater }: StepProps) {
  const t = useTranslations("onboarding.goals");
  const categories = useCategories();
  const save = useSaveSection("goals");
  const saved = state.sections.goals;
  const form = useForm<GoalsInput>({
    resolver: zodResolver(GoalsInput),
    mode: "onTouched",
    defaultValues: saved ?? { learning_goals: "", interest_category_ids: [], topics: [] },
  });
  const { errors } = form.formState;
  const { onSubmit, formError } = useStepSubmit(form, (v) => save.mutateAsync(v), onDone);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />
      <Field label={t("goals")} hint={t("goalsHint")} error={errors.learning_goals?.message}>
        {(a) => <Textarea {...a} rows={4} maxLength={1000} {...form.register("learning_goals")} />}
      </Field>
      {categories.isPending ? (
        <LoadingState />
      ) : (
        <Controller
          control={form.control}
          name="interest_category_ids"
          render={({ field, fieldState }) => (
            <ChoiceChips
              legend={t("interests")}
              hint={t("interestsHint")}
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
        name="topics"
        render={({ field, fieldState }) => (
          <TagInput
            label={t("topics")}
            hint={t("topicsHint")}
            placeholder={t("topicsPlaceholder")}
            max={10}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <StepActions onBack={onBack} onLater={onLater} pending={save.isPending} />
    </form>
  );
}
