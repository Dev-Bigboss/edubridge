"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { AvatarUpload } from "@/components/uploads/avatar-upload";
import { applyApiError } from "@/lib/api/form-errors";
import { useMyProfile, useSaveProfile } from "@/lib/api/hooks/account";
import type { MyProfile } from "@/lib/api/schemas/account";
import type { User } from "@/lib/api/schemas/auth";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { countryOptions, timeZoneOptions } from "@/lib/domain/places";

export function ProfileTab({ user }: { user: User }) {
  const query = useMyProfile();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <LoadError onRetry={query.refetch} />;
  return <ProfileForm profile={query.data} instructor={user.role === "INSTRUCTOR"} />;
}

function ProfileForm({ profile, instructor }: { profile: MyProfile; instructor: boolean }) {
  const t = useTranslations("account.profile");
  const save = useSaveProfile();
  const [avatar, setAvatar] = useState<StoredFile | null>(profile.avatar);
  const [formError, setFormError] = useState<string | null>(null);
  const zones = useMemo(() => timeZoneOptions(), []);
  const countries = useMemo(() => countryOptions(), []);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, { error: t("nameRequired") }).max(120),
        timezone: z.string().min(1),
        country: z.string(),
        headline: instructor ? z.string().trim().min(10, { error: t("headlineShort") }).max(120) : z.string(),
        bio: instructor ? z.string().trim().min(80, { error: t("bioShort") }).max(2000) : z.string(),
      }),
    [instructor, t],
  );
  type Values = z.infer<typeof schema>;
  const defaults: Values = {
    name: profile.name,
    timezone: profile.timezone,
    country: profile.country ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
  };
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults, mode: "onTouched" });
  const { errors, isDirty } = form.formState;
  const name = useWatch({ control: form.control, name: "name" });
  const bio = useWatch({ control: form.control, name: "bio" }) ?? "";
  const changed = isDirty || avatar?.id !== profile.avatar?.id;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync({
        name: v.name.trim(),
        avatar_file_id: avatar?.id ?? null,
        timezone: v.timezone,
        country: v.country || null,
        headline: instructor ? v.headline.trim() : null,
        bio: instructor ? v.bio.trim() : null,
      });
      form.reset(v);
      toast.success(t("saved"));
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <FormError message={formError} />
      <AvatarUpload name={name || profile.name} value={avatar} onChange={setAvatar} />
      <Field label={t("name")} error={errors.name?.message}>
        {(a) => <Input {...a} autoComplete="name" {...form.register("name")} />}
      </Field>
      <Field label={t("email")} hint={t("emailHint")}>
        {(a) => <Input {...a} type="email" value={profile.email} readOnly disabled />}
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("timezone")} hint={t("timezoneHint")}>
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
        <Field label={t("country")}>
          {(a) => (
            <Select {...a} {...form.register("country")}>
              <option value="">{t("chooseCountry")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {instructor && (
        <>
          <Field label={t("headline")} hint={t("headlineHint")} error={errors.headline?.message}>
            {(a) => <Input {...a} maxLength={120} {...form.register("headline")} />}
          </Field>
          <Field label={t("bio")} hint={t("bioCount", { count: bio.trim().length })} error={errors.bio?.message}>
            {(a) => <Textarea {...a} rows={6} maxLength={2000} {...form.register("bio")} />}
          </Field>
        </>
      )}
      <div className="flex justify-end border-t border-border-subtle pt-5">
        <Button type="submit" loading={save.isPending} disabled={!changed}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
