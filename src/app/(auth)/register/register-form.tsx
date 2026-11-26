"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, GraduationCap, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AuthCard, AuthFooterLink, FormError } from "@/components/auth/auth-card";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { applyApiError } from "@/lib/api/form-errors";
import { RegisterRequest } from "@/lib/api/schemas/auth";
import { afterSignInPath, safeNextPath } from "@/lib/auth/routes";
import { useRegister, useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { browserTimeZone } from "@/lib/domain/time";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { data: currentUser } = useSession();
  const register = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequest),
    mode: "onTouched",
    defaultValues: {
      role: params.get("role") === "instructor" ? "INSTRUCTOR" : "LEARNER",
      name: "",
      email: "",
      password: "",
      timezone: "UTC",
      terms_version: LEGAL_VERSIONS.terms,
      privacy_version: LEGAL_VERSIONS.privacy,
    },
  });
  const { errors } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });
  const timezone = useWatch({ control: form.control, name: "timezone" });

  // The browser's zone is only known on the client, so fill it in after mount.
  useEffect(() => form.setValue("timezone", browserTimeZone()), [form]);

  useEffect(() => {
    if (currentUser) router.replace(afterSignInPath(currentUser, next));
  }, [currentUser, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await register.mutateAsync(values);
      const q = new URLSearchParams({ email: res.email });
      if (next) q.set("next", next);
      router.push(`/verify-email?${q}`);
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  const roles = [
    { value: "LEARNER", icon: BookOpen, label: t("roleLearner"), hint: t("roleLearnerHint") },
    { value: "INSTRUCTOR", icon: GraduationCap, label: t("roleInstructor"), hint: t("roleInstructorHint") },
  ] as const;

  const legalLink = (href: string) =>
    function LegalLink(chunks: React.ReactNode) {
      return (
        <Link href={href} target="_blank" className="font-medium text-primary underline underline-offset-4">
          {chunks}
        </Link>
      );
    };

  return (
    <AuthCard
      icon={UserPlus}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={<AuthFooterLink prompt={t("haveAccount")} href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} label={t("signIn")} />}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-2 font-heading text-[15px] font-medium text-heading">{t("roleLegend")}</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex min-h-[88px] cursor-pointer flex-col gap-1 rounded-sm border bg-white p-3 transition-colors duration-150",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2",
                  role === r.value ? "border-primary bg-surface-2" : "border-border hover:border-body/50",
                )}
              >
                <input type="radio" value={r.value} className="sr-only" {...form.register("role")} />
                <span className="flex items-center gap-2 font-heading font-medium text-heading">
                  <r.icon aria-hidden="true" className="size-5 text-primary" />
                  {r.label}
                </span>
                <span className="text-sm leading-snug">{r.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <GoogleButton role={role} next={next} />
        <p className="-mt-2 text-center text-sm leading-relaxed">{t("googleConsent")}</p>
        <OrDivider />

        <FormError message={formError} />

        <Field label={t("name")} error={errors.name?.message}>
          {(a) => <Input {...a} autoComplete="name" {...form.register("name")} />}
        </Field>
        <Field label={t("email")} error={errors.email?.message}>
          {(a) => (
            <Input {...a} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} {...form.register("email")} />
          )}
        </Field>
        <Field label={t("password")} error={errors.password?.message} hint={t("passwordHint")}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("password")} />}
        </Field>

        <ConsentCheckbox
          error={errors.accept_terms?.message}
          label={t.rich("consent", { terms: legalLink("/legal/terms"), privacy: legalLink("/legal/privacy") })}
          {...form.register("accept_terms")}
        />

        <p className="text-sm leading-relaxed">{t("timezone", { zone: timezone })}</p>

        <Button type="submit" className="h-12 w-full" loading={register.isPending}>
          {register.isPending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </AuthCard>
  );
}

function ConsentCheckbox({
  label,
  error,
  ...input
}: { label: React.ReactNode; error?: string } & React.ComponentProps<"input">) {
  const errorId = "consent-error";
  return (
    <div>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 leading-relaxed">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-primary"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
