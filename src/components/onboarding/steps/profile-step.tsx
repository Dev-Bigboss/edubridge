"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormError } from "@/components/auth/auth-card";
import { AvatarUpload } from "@/components/uploads/avatar-upload";
import { Field, Input } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/select";
import { useSaveSection } from "@/lib/api/hooks/onboarding";
import { InstructorProfileInput, ProfileInput } from "@/lib/api/schemas/onboarding";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { countryOptions, guessCountry, timeZoneOptions } from "@/lib/domain/places";
import { browserTimeZone } from "@/lib/domain/time";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";
import { useStepSubmit } from "./use-step-form";

type Values = InstructorProfileInput;

export function ProfileStep({ state, onDone, onLater, instructor }: StepProps & { instructor?: boolean }) {
  const t = useTranslations("onboarding.profile");
  const saved = state.sections.profile;
  const save = useSaveSection("profile");
  const [avatar, setAvatar] = useState<StoredFile | null>(saved?.avatar ?? null);
  const countries = useMemo(() => countryOptions(), []);
  const zones = useMemo(() => timeZoneOptions(), []);

  const form = useForm<Values>({
    resolver: zodResolver((instructor ? InstructorProfileInput : ProfileInput) as typeof InstructorProfileInput),
    mode: "onTouched",
    defaultValues: {
      name: saved?.name ?? "",
      avatar_file_id: saved?.avatar?.id ?? null,
      // A brand-new UTC default usually means "we didn't know"; the browser's zone is a better start.
      timezone: saved?.timezone && saved.timezone !== "UTC" ? saved.timezone : browserTimeZone(),
      country: saved?.country ?? guessCountry() ?? "",
      headline: saved?.headline ?? "",
      bio: saved?.bio ?? "",
    },
  });
  const { errors } = form.formState;
  const name = useWatch({ control: form.control, name: "name" });
  const bio = useWatch({ control: form.control, name: "bio" }) ?? "";

  const { onSubmit, formError } = useStepSubmit(
    form,
    (v) => save.mutateAsync(instructor ? v : { name: v.name, avatar_file_id: v.avatar_file_id, timezone: v.timezone, country: v.country }),
    onDone,
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <AvatarUpload
        name={name}
        value={avatar}
        onChange={(f) => {
          setAvatar(f);
          form.setValue("avatar_file_id", f?.id ?? null, { shouldDirty: true });
        }}
      />
      <Field label={t("name")} error={errors.name?.message}>
        {(a) => <Input {...a} autoComplete="name" {...form.register("name")} />}
      </Field>
      {instructor && (
        <>
          <Field label={t("headline")} hint={t("headlineHint")} error={errors.headline?.message}>
            {(a) => <Input {...a} maxLength={120} {...form.register("headline")} />}
          </Field>
          <Field
            label={t("bio")}
            hint={t("bioHint", { count: bio.trim().length })}
            error={errors.bio?.message}
          >
            {(a) => <Textarea {...a} rows={6} maxLength={2000} {...form.register("bio")} />}
          </Field>
        </>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("country")} error={errors.country?.message}>
          {(a) => (
            <Select {...a} autoComplete="country" {...form.register("country")}>
              <option value="">{t("choose")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("timezone")} hint={t("timezoneHint")} error={errors.timezone?.message}>
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
      </div>
      <StepActions onLater={onLater} pending={save.isPending} />
    </form>
  );
}
