"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthCard, FormError } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { applyApiError } from "@/lib/api/form-errors";
import { ResetPasswordForm as Schema } from "@/lib/api/schemas/auth";
import { useResetPassword } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
  const router = useRouter();
  const token = useSearchParams().get("token");
  const reset = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Schema>({ resolver: zodResolver(Schema), mode: "onTouched" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await reset.mutateAsync({ token: token!, password });
      toast.success(t("success"));
      router.replace("/login");
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <AuthCard icon={KeyRound} title={t("title")} subtitle={token ? t("subtitle") : undefined}>
      {!token ? (
        <div className="space-y-4">
          <FormError message={t("missingToken")} />
          <Link href="/forgot-password" className={cn(buttonVariants({ variant: "primary" }), "h-12 w-full")}>
            {t("requestNew")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormError message={formError} />
          {formError && (
            <Link href="/forgot-password" className="block font-medium text-primary underline underline-offset-4">
              {t("requestNew")}
            </Link>
          )}
          <Field label={t("password")} error={errors.password?.message}>
            {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("password")} />}
          </Field>
          <Field label={t("confirm")} error={errors.confirm?.message}>
            {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("confirm")} />}
          </Field>
          <Button type="submit" className="h-12 w-full" loading={reset.isPending}>
            {reset.isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
